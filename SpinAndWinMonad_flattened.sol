// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// OpenZeppelin Contracts (last updated v5.0.0) (security/ReentrancyGuard.sol)

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 */
abstract contract ReentrancyGuard {
    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    uint256 private _status;

    /**
     * @dev Unauthorized reentrant call.
     */
    error ReentrancyGuardReentrantCall();

    constructor() {
        _status = _NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    function _nonReentrantBefore() private {
        // On the first call to nonReentrant, _status will be _NOT_ENTERED
        if (_status == _ENTERED) {
            revert ReentrancyGuardReentrantCall();
        }

        // Any calls to nonReentrant after this point will fail
        _status = _ENTERED;
    }

    function _nonReentrantAfter() private {
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _status = _NOT_ENTERED;
    }

    /**
     * @dev Returns true if the reentrancy guard is currently set to "entered", which indicates there is a
     * `nonReentrant` function in the call stack.
     */
    function _reentrancyGuardEntered() internal view returns (bool) {
        return _status == _ENTERED;
    }
}

// OpenZeppelin Contracts (last updated v5.0.0) (security/Pausable.sol)

/**
 * @dev Contract module which allows children to implement an emergency stop
 * mechanism that can be triggered by an authorized account.
 *
 * This module is used through inheritance. It will make available the
 * modifiers `whenNotPaused` and `whenPaused`, which can be applied to
 * the functions of your contract. Note that they will not be pausable by
 * simply including this module, only once the modifiers are put in place.
 */
abstract contract Pausable is Context {
    bool private _paused;

    /**
     * @dev The operation failed because the contract is paused.
     */
    error EnforcedPause();

    /**
     * @dev The operation failed because the contract is not paused.
     */
    error ExpectedPause();

    /**
     * @dev Emitted when the pause is triggered by `account`.
     */
    event Paused(address account);

    /**
     * @dev Emitted when the pause is lifted by `account`.
     */
    event Unpaused(address account);

    /**
     * @dev The operation failed because the contract is paused.
     */
    modifier whenNotPaused() {
        _requireNotPaused();
        _;
    }

    /**
     * @dev The operation failed because the contract is not paused.
     */
    modifier whenPaused() {
        _requirePaused();
        _;
    }

    /**
     * @dev Returns true if the contract is paused, and false otherwise.
     */
    function paused() public view virtual returns (bool) {
        return _paused;
    }

    /**
     * @dev Throws if the contract is paused.
     */
    function _requireNotPaused() internal view virtual {
        if (paused()) {
            revert EnforcedPause();
        }
    }

    /**
     * @dev Throws if the contract is not paused.
     */
    function _requirePaused() internal view virtual {
        if (!paused()) {
            revert ExpectedPause();
        }
    }

    /**
     * @dev Triggers stopped state.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    function _pause() internal virtual whenNotPaused {
        _paused = true;
        emit Paused(_msgSender());
    }

    /**
     * @dev Returns to normal state.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    function _unpause() internal virtual whenPaused {
        _paused = false;
        emit Unpaused(_msgSender());
    }
}

// OpenZeppelin Contracts (last updated v5.0.0) (access/Ownable.sol)

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * The initial owner is set to the address provided by the deployer. This can
 * later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    /**
     * @dev The caller account is not authorized to perform an operation.
     */
    error OwnableUnauthorizedAccount(address account);

    /**
     * @dev The owner is not a valid owner account. (eg. `address(0)`)
     */
    error OwnableInvalidOwner(address owner);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the address provided by the deployer as the initial owner.
     */
    constructor(address initialOwner) {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby disabling any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

// OpenZeppelin Contracts (last updated v5.0.0) (utils/Context.sol)

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}

/*====================================================================
  SpinAndWinMonad — MON token based spin game without Chainlink VRF
  ====================================================================*/
contract SpinAndWinMonad is ReentrancyGuard, Pausable, Ownable {
    /*──── CONSTANTS ────*/
    uint256 public constant SPIN_PRICE = 0.05 ether; // 0.05 MON
    uint16  public constant MAX_FEE_BP      = 1_000; // 10 %
    uint16  public constant MAX_JP_SHARE_BP = 5_000; // 50 % cap
    uint256 public constant MAX_JACKPOT = 100 ether; // Jackpot cap - 100 MON

    /*──── CONFIGURABLE RATES ────*/
    uint16 public spinFeeBP   = 500;  // 5 % of spin price → ownerFees
    uint16 public claimFeeBP  = 200;  // 2 % of claim amount
    uint16 public jackpotShareBP = 2000; // 20 % of net → jackpotPool

    /*──── POOLS & FEES ────*/
    uint256 public prizePool;
    uint256 public jackpotPool;
    uint256 public ownerFees;

    /*──── USER DATA ────*/
    struct User { uint256 spins; uint256 claimable; uint256 claimed; }
    mapping(address => User) public users;

    /*──── PRIZE TABLE (private) ────*/
    struct Prize { uint256 amount; uint16 prob; } // prob / 1000
    Prize[] private prizes;

    /*──── RANDOMNESS ────*/
    uint256 private nonce;

    /*──── EVENTS ────*/
    event SpinResult(address indexed player, uint256 reward, uint256 jpReward, uint8 prizeIndex);
    event Claimed(address indexed player, uint256 net, uint256 fee);
    event FeesWithdrawn(uint256 amount);
    event PoolWithdrawn(uint256 amount);
    event JackpotWithdrawn(uint256 amount);
    event JackpotFunded(uint256 amount);
    event FeesUpdated(uint16 spinBP, uint16 claimBP);
    event JackpotShareUpdated(uint16 shareBP);
    event PoolsShifted(string direction, uint256 amount);

    /*──── CONSTRUCTOR ────*/
    constructor() Ownable(msg.sender) {
        // MON token prizes (higher values than ETH)
        prizes.push(Prize(10 ether, 1));    // 10 MON - 0.1%
        prizes.push(Prize(5 ether, 2));     // 5 MON - 0.2%
        prizes.push(Prize(2 ether, 5));     // 2 MON - 0.5%
        prizes.push(Prize(1 ether, 10));    // 1 MON - 1%
        prizes.push(Prize(0.5 ether, 50));  // 0.5 MON - 5%
        prizes.push(Prize(0.2 ether, 200)); // 0.2 MON - 20%
        prizes.push(Prize(0, 732));         // %73.2 şansla hiçbir şey kazanamaz (Try Again/Empty)
    }

    /*──── ADMIN SETTINGS ────*/
    function setFees(uint16 newSpinBP, uint16 newClaimBP) external onlyOwner {
        require(newSpinBP <= MAX_FEE_BP && newClaimBP <= MAX_FEE_BP, "fee too high");
        spinFeeBP  = newSpinBP;
        claimFeeBP = newClaimBP;
        emit FeesUpdated(newSpinBP, newClaimBP);
    }
    
    function setJackpotShare(uint16 newShareBP) external onlyOwner {
        require(newShareBP <= MAX_JP_SHARE_BP, "share too high");
        jackpotShareBP = newShareBP;
        emit JackpotShareUpdated(newShareBP);
    }
    
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    /*──── SPIN ────*/
    function spin() external payable whenNotPaused nonReentrant {
        require(msg.value >= SPIN_PRICE, "min price 0.05 MON");
        require(msg.value <= SPIN_PRICE + 1e12, "too much value sent"); // 0.000001 MON tolerans

        uint256 fee = (SPIN_PRICE * spinFeeBP) / 10_000;
        ownerFees  += fee;
        uint256 net = SPIN_PRICE - fee;

        uint256 jpShare = (net * jackpotShareBP) / 10_000;
        jackpotPool += jpShare;
        prizePool   += net - jpShare;

        // Fazla gönderilen miktarı iade et
        if (msg.value > SPIN_PRICE) {
            (bool ok, ) = msg.sender.call{value: msg.value - SPIN_PRICE}("");
            require(ok, "refund failed");
        }

        // Jackpot cap kontrolü
        if (jackpotPool > MAX_JACKPOT) {
            uint256 excess = jackpotPool - MAX_JACKPOT;
            jackpotPool = MAX_JACKPOT;
            prizePool += excess;
        }

        // Generate pseudo-random number
        uint256 randomNumber = _generateRandomNumber();
        
        // Process spin result
        _processSpinResult(msg.sender, randomNumber);
        
        users[msg.sender].spins += 1;
    }

    /*──── RANDOM NUMBER GENERATION ────*/
    function _generateRandomNumber() private returns (uint256) {
        nonce++;
        return uint256(keccak256(abi.encodePacked(
            block.timestamp,
            msg.sender,
            nonce
        )));
    }

    /*──── PROCESS SPIN RESULT ────*/
    function _processSpinResult(address player, uint256 randomNumber) private {
        // Main reward
        uint256 r = randomNumber % 1000;
        uint256 acc; 
        uint256 reward;
        uint8 prizeIndex = 255;
        
        for (uint256 i; i < prizes.length; ++i) {
            acc += prizes[i].prob;
            if (r < acc) { 
                reward = prizes[i].amount; 
                prizeIndex = uint8(i); 
                break; 
            }
        }
        
        if (reward > 0 && prizePool >= reward) {
            prizePool -= reward;
            users[player].claimable += reward;
        }

        // Jackpot reward - improved chances
        uint256 jr = (randomNumber >> 10) % 1000;
        uint256 jpReward;
        if (jr < 10)      jpReward = (jackpotPool * 30) / 100; // 1‰ → 30%
        else if (jr < 30) jpReward = (jackpotPool * 15) / 100; // 2‰ → 15%
        else if (jr < 80) jpReward = (jackpotPool * 5)  / 100; // 5‰ → 5%

        if (jpReward > 0) {
            jackpotPool -= jpReward;
            users[player].claimable += jpReward;
        }
        
        emit SpinResult(player, reward, jpReward, prizeIndex);
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

    // Owner jackpot havuzunu normal havuza aktarabilir
    function shiftJackpotToPool(uint256 amount) external onlyOwner nonReentrant {
        require(amount <= jackpotPool, "exceeds jackpot");
        jackpotPool -= amount;
        prizePool += amount;
        emit PoolsShifted("jackpot_to_pool", amount);
    }

    // Owner normal havuzu jackpot'a aktarabilir
    function shiftPoolToJackpot(uint256 amount) external onlyOwner nonReentrant {
        require(amount <= prizePool, "exceeds pool");
        require(jackpotPool + amount <= MAX_JACKPOT, "would exceed jackpot cap");
        prizePool -= amount;
        jackpotPool += amount;
        emit PoolsShifted("pool_to_jackpot", amount);
    }

    // Owner jackpot cap'ini geçici olarak artırabilir (sadece transfer için)
    function emergencyJackpotWithdraw(uint256 amount) external onlyOwner nonReentrant {
        require(amount <= jackpotPool, "exceeds jackpot");
        jackpotPool -= amount;
        _safeSend(payable(owner()), amount);
        emit JackpotWithdrawn(amount);
    }

    /*──── INTERNAL SAFE SEND ────*/
    function _safeSend(address payable to, uint256 value) private {
        (bool ok, ) = to.call{ value: value }("");
        require(ok, "MON transfer failed");
    }

    /*──── Optional external funding ────*/
    receive() external payable { prizePool += msg.value; }
}
