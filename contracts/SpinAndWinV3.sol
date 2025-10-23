// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/interfaces/IVRFCoordinatorV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/*====================================================================
  SpinAndWinV3 — owner‑configurable pools, fees, jackpot share
  + Failed payouts tracking and emergency withdraw
  ====================================================================*/
contract SpinAndWinV3 is VRFConsumerBaseV2Plus, ReentrancyGuard, Pausable {
    /*──── CONSTANTS ────*/
    uint256 public constant SPIN_PRICE = 0.0005 ether;
    uint16  public constant MAX_FEE_BP      = 1_000; // 10 %
    uint16  public constant MAX_JP_SHARE_BP = 5_000; // 50 % cap
    uint256 public constant MAX_JACKPOT = 40 ether; // Jackpot cap - 40 ETH

    /*──── CONFIGURABLE RATES ────*/
    uint16 public spinFeeBP   = 500;  // 5 % of spin price → ownerFees
    uint16 public claimFeeBP  = 200;  // 2 % of claim amount
    uint16 public jackpotShareBP = 2000; // 20 % of net → jackpotPool

    /*──── VRF CONFIG ────*/
    IVRFCoordinatorV2Plus public immutable COORD;
    uint256 public immutable subId;
    bytes32 public immutable keyHash;
    uint32  public callbackGasLimit  = 200_000; // Optimized for cost efficiency
    uint16  public requestConfirmations = 3;
    uint32  public numWords = 1;

    /*──── POOLS & FEES ────*/
    uint256 public prizePool;
    uint256 public jackpotPool;
    uint256 public ownerFees;
    uint256 public totalReservedForUsers; // Toplam kullanıcılara rezerve edilen miktar
    uint256 public failedPayoutsTotal; // Başarısız ödemelerin toplamı

    /*──── USER DATA ────*/
    struct User { uint256 spins; uint256 claimable; uint256 claimed; }
    mapping(address => User) public users;

    /*──── PRIZE TABLE (private) ────*/
    struct Prize { uint256 amount; uint16 prob; } // prob / 1000
    Prize[] private prizes;

    /*──── VRF MAP ────*/
    mapping(uint256 => address) private reqPlayer;

    /*──── EVENTS ────*/
    event SpinStarted(address indexed player, uint256 indexed requestId);
    event SpinResult(address indexed player,uint256 indexed requestId,uint256 reward,uint256 jpReward,uint8 prizeIndex);
    event Claimed(address indexed player,uint256 net,uint256 fee);
    event FeesWithdrawn(uint256 amount);
    event PoolWithdrawn(uint256 amount);
    event JackpotWithdrawn(uint256 amount);
    event JackpotFunded(uint256 amount);
    event FeesUpdated(uint16 spinBP,uint16 claimBP);
    event JackpotShareUpdated(uint16 shareBP);
    event PoolsShifted(string direction,uint256 amount);
    event PayoutFailed(address indexed recipient, uint256 amount);
    event FailedPayoutsWithdrawn(uint256 amount);

    /*──── CONSTRUCTOR ────*/
    constructor(address coordinator,uint256 _subId,bytes32 _keyHash)
        VRFConsumerBaseV2Plus(coordinator)
    {
        COORD   = IVRFCoordinatorV2Plus(coordinator);
        subId   = _subId;
        keyHash = _keyHash;

        prizes.push(Prize(0.05  ether, 1));
        prizes.push(Prize(0.01  ether, 2));
        prizes.push(Prize(0.005 ether, 5));
        prizes.push(Prize(0.0025 ether,10));
        prizes.push(Prize(0.0005 ether,50));
        prizes.push(Prize(0.00005 ether,200));
        prizes.push(Prize(0, 732)); 
    }

    /*──── ADMIN SETTINGS ────*/
    function setFees(uint16 newSpinBP, uint16 newClaimBP) external onlyOwner {
        require(newSpinBP <= MAX_FEE_BP && newClaimBP <= MAX_FEE_BP, "fee too high");
        spinFeeBP  = newSpinBP;
        claimFeeBP = newClaimBP;
        emit FeesUpdated(newSpinBP,newClaimBP);
    }
    function setJackpotShare(uint16 newShareBP) external onlyOwner {
        require(newShareBP <= MAX_JP_SHARE_BP, "share too high");
        jackpotShareBP = newShareBP;
        emit JackpotShareUpdated(newShareBP);
    }
    function setCallbackGas(uint32 gas) external onlyOwner { callbackGasLimit = gas; }
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    /*──── SPIN ────*/
    function spin() external payable whenNotPaused nonReentrant {
        require(msg.value == SPIN_PRICE, "price 0.0005 ETH");
        uint256 fee = (msg.value * spinFeeBP) / 10_000;
        ownerFees  += fee;
        uint256 net = msg.value - fee;

        uint256 jpShare = (net * jackpotShareBP) / 10_000;
        jackpotPool += jpShare;
        prizePool   += net - jpShare;

        // Jackpot cap kontrolü
        if (jackpotPool > MAX_JACKPOT) {
            uint256 excess = jackpotPool - MAX_JACKPOT;
            jackpotPool = MAX_JACKPOT;
            prizePool += excess;
        }

        VRFV2PlusClient.RandomWordsRequest memory req = VRFV2PlusClient.RandomWordsRequest({
            keyHash: keyHash,
            subId:   subId,
            requestConfirmations: requestConfirmations,
            callbackGasLimit:     callbackGasLimit,
            numWords:             numWords,
            extraArgs: VRFV2PlusClient._argsToBytes(
                VRFV2PlusClient.ExtraArgsV1({ nativePayment: true })
            )
        });
        uint256 requestId = COORD.requestRandomWords(req);
        reqPlayer[requestId] = msg.sender;
        users[msg.sender].spins += 1;
        emit SpinStarted(msg.sender, requestId);
    }

    /*──── VRF CALLBACK ────*/
    function fulfillRandomWords(uint256 requestId,uint256[] calldata rnd) internal override {
        address player = reqPlayer[requestId];
        delete reqPlayer[requestId];
        if (player == address(0)) return;

        // main reward
        uint256 r = rnd[0] % 1000;
        uint256 acc; uint256 reward;
        uint8 prizeIndex = 255;
        for (uint256 i; i < prizes.length; ++i) {
            acc += prizes[i].prob;
            if (r < acc) { reward = prizes[i].amount; prizeIndex = uint8(i); break; }
        }
        if (reward > 0 && prizePool >= reward) {
            prizePool -= reward;
            users[player].claimable += reward;
            totalReservedForUsers += reward;
        }

        // jackpot reward - improved chances
        uint256 jr = (rnd[0] >> 10) % 1000;
        uint256 jpReward;
        if (jr < 10)      jpReward = (jackpotPool * 30) / 100;
        else if (jr < 30) jpReward = (jackpotPool * 15) / 100;
        else if (jr < 80) jpReward = (jackpotPool * 5)  / 100;

        if (jpReward > 0) {
            jackpotPool -= jpReward;
            users[player].claimable += jpReward;
            totalReservedForUsers += jpReward;
        }
        emit SpinResult(player, requestId, reward, jpReward, prizeIndex);
    }

    /*──── CLAIM ────*/
    function claim() external nonReentrant {
        uint256 amt = users[msg.sender].claimable;
        require(amt > 0, "nothing to claim");
        uint256 fee = (amt * claimFeeBP) / 10_000;
        uint256 net = amt - fee;
        ownerFees  += fee;
        users[msg.sender].claimable = 0;
        users[msg.sender].claimed  += net;
        totalReservedForUsers -= amt; // Rezerve edilen miktarı azalt
        _safeSend(payable(msg.sender), net);
        emit Claimed(msg.sender, net, fee);
    }

    /*──── OWNER WITHDRAW ────*/
    function withdrawFees(uint256 amt) external onlyOwner nonReentrant {
        require(amt <= ownerFees, "exceeds fees");
        ownerFees -= amt; 
        _safeSend(payable(owner()), amt);
        emit FeesWithdrawn(amt);
    }
    function withdrawAllFees() external onlyOwner nonReentrant {
        uint256 amt = ownerFees; 
        ownerFees = 0;
        _safeSend(payable(owner()), amt); 
        emit FeesWithdrawn(amt);
    }

    function withdrawPool(uint256 amt) external onlyOwner nonReentrant {
        require(amt <= prizePool, "exceeds pool");
        prizePool -= amt; 
        _safeSend(payable(owner()), amt);
        emit PoolWithdrawn(amt);
    }
    function withdrawAllPool() external onlyOwner nonReentrant {
        uint256 amt = prizePool; 
        prizePool = 0;
        _safeSend(payable(owner()), amt); 
        emit PoolWithdrawn(amt);
    }

    function withdrawJackpot(uint256 amt) external onlyOwner nonReentrant {
        require(amt <= jackpotPool, "exceeds jackpot");
        jackpotPool -= amt; 
        _safeSend(payable(owner()), amt);
        emit JackpotWithdrawn(amt);
    }
    function withdrawAllJackpot() external onlyOwner nonReentrant {
        uint256 amt = jackpotPool; 
        jackpotPool = 0;
        _safeSend(payable(owner()), amt); 
        emit JackpotWithdrawn(amt);
    }

    function shiftJackpotToPool(uint256 amount) external onlyOwner nonReentrant {
        require(amount <= jackpotPool, "exceeds jackpot");
        jackpotPool -= amount;
        prizePool += amount;
        emit PoolsShifted("jackpot_to_pool", amount);
    }

    function shiftPoolToJackpot(uint256 amount) external onlyOwner nonReentrant {
        require(amount <= prizePool, "exceeds pool");
        require(jackpotPool + amount <= MAX_JACKPOT, "would exceed jackpot cap");
        prizePool -= amount;
        jackpotPool += amount;
        emit PoolsShifted("pool_to_jackpot", amount);
    }

    function emergencyJackpotWithdraw(uint256 amount) external onlyOwner nonReentrant {
        require(amount <= jackpotPool, "exceeds jackpot");
        jackpotPool -= amount;
        _safeSend(payable(owner()), amount);
        emit JackpotWithdrawn(amount);
    }

    // Başarısız ödemeleri çek
    function withdrawAllFailedPayouts() external onlyOwner nonReentrant {
        uint256 amount = failedPayoutsTotal;
        require(amount > 0, "no failed payouts");
        
        failedPayoutsTotal = 0;
        
        // Owner'a gönderirken başarısız olursa tekrar revert etmesin
        (bool ok, ) = payable(owner()).call{ value: amount }("");
        if (!ok) {
            // Owner'a bile gönderilemiyorsa, geri koy
            failedPayoutsTotal = amount;
            revert("owner transfer failed");
        }
        
        emit FailedPayoutsWithdrawn(amount);
    }

    // Acil durum fonksiyonu - Tüm kontrakt bakiyesini çek (kullanıcıların parası dahil)
    function emergencyWithdrawAll() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "no balance");
        
        // Tüm state'leri sıfırla
        prizePool = 0;
        jackpotPool = 0;
        ownerFees = 0;
        totalReservedForUsers = 0;
        failedPayoutsTotal = 0;
        
        // Owner'a gönderirken revert etme
        (bool ok, ) = payable(owner()).call{ value: balance }("");
        if (!ok) {
            revert("emergency transfer failed");
        }
        
        emit PoolWithdrawn(balance);
    }

    // Sadece fazla/ekstra bakiyeyi çek (havuzlar dışında kalan)
    function withdrawExcessBalance() external onlyOwner nonReentrant {
        uint256 totalAllocated = prizePool + jackpotPool + ownerFees + totalReservedForUsers;
        uint256 balance = address(this).balance;
        require(balance > totalAllocated, "no excess balance");
        
        uint256 excess = balance - totalAllocated;
        _safeSend(payable(owner()), excess);
        emit PoolWithdrawn(excess);
    }

    /*──── INTERNAL SAFE SEND ────*/
    function _safeSend(address payable to, uint256 value) private {
        (bool ok, ) = to.call{ value: value }("");
        if (!ok) {
            // Transfer başarısız oldu - miktarı başarısız ödemeler havuzuna ekle
            failedPayoutsTotal += value;
            emit PayoutFailed(to, value);
        }
    }

    // Helper fonksiyon - Mevcut durumu görmek için
    function getContractStatus() external view returns (
        uint256 contractBalance,
        uint256 _prizePool,
        uint256 _jackpotPool,
        uint256 _ownerFees,
        uint256 _totalReservedForUsers,
        uint256 _failedPayoutsTotal,
        uint256 availableToWithdraw
    ) {
        contractBalance = address(this).balance;
        _prizePool = prizePool;
        _jackpotPool = jackpotPool;
        _ownerFees = ownerFees;
        _totalReservedForUsers = totalReservedForUsers;
        _failedPayoutsTotal = failedPayoutsTotal;
        
        // Çekilebilir miktar = Kontrakt bakiyesi - Kullanıcılara rezerve edilen
        if (contractBalance > totalReservedForUsers) {
            availableToWithdraw = contractBalance - totalReservedForUsers;
        } else {
            availableToWithdraw = 0;
        }
    }

    /*──── Optional external funding ────*/
    receive() external payable { prizePool += msg.value; }
}

