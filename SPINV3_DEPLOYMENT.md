# SpinAndWinV3 Deployment Guide

## Mevcut Kontrakt
- **Adres**: `0xD42C4bf8b404b4Bf3e24348d50B58EdA01DF3b07`
- **Network**: Base Mainnet
- **VRF Version**: v2.5

## Yeni Kontrakt Özellikleri
✅ Failed payouts tracking (`failedPayoutsTotal`)
✅ Total reserved for users tracking (`totalReservedForUsers`)
✅ Emergency withdraw functions
✅ Contract status viewer (`getContractStatus()`)
✅ Safe transfer mechanism (no ETH lockup)

## Deployment Parametreleri (Base Mainnet)

```solidity
constructor(
    address coordinator: 0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634
    uint256 _subId: 17952329676849432097364691293412979287742510665681724364050779803330792847198
    bytes32 _keyHash: 0x9e9e46732b32662b9adc6f3abdf6c5e926a666d174a4d6b8e39c4213e0d2c44b
)
```

## Remix Deployment Adımları

1. **Remix'de Aç**: https://remix.ethereum.org
2. **Dosyayı Yükle**: `contracts/SpinAndWinV3.sol`
3. **Dependencies Install**: 
   - Remix otomatik olarak `@chainlink` ve `@openzeppelin` import'larını çözecek
4. **Compiler Ayarları**:
   - Compiler: `0.8.19`
   - EVM Version: `paris` veya `default`
   - Optimization: Enabled (200 runs)
5. **Deploy**:
   - Environment: `Injected Provider - MetaMask`
   - Network: Base Mainnet
   - Constructor args yukarıdaki gibi gir
   - Deploy butonuna bas

## Deploy Sonrası Adımlar

### 1. VRF Subscription'a Consumer Ekle
```
https://vrf.chain.link/base
→ Subscription'ınızı seçin (ID: 17952...)
→ "Add consumer" → Yeni kontrakt adresini ekleyin
```

### 2. Eski Kontraktan Migration

**Eski Kontrakt İşlemleri:**
```javascript
// 1. Pause et
await oldContract.pause();

// 2. Havuz bakiyelerini kontrol et
const prizePool = await oldContract.prizePool();
const jackpotPool = await oldContract.jackpotPool();
const ownerFees = await oldContract.ownerFees();

// 3. Çek (güvenli bir cüzdana)
await oldContract.withdrawAllPool();
await oldContract.withdrawAllJackpot();
await oldContract.withdrawAllFees();
```

**Yeni Kontrakt İşlemleri:**
```javascript
// 4. Yeni kontraktı fonla
await newContract.receive({ value: prizePoolAmount });
// veya owner olarak shiftPoolToJackpot() kullan

// 5. Test et
await newContract.spin({ value: parseEther("0.0005") });
```

### 3. Frontend'i Güncelle

**Dosya**: `src/contracts/SpinAndWinV3.ts`

```typescript
// Kontrakt adresini güncelle
export const CONTRACT_ADDRESS = "YENİ_KONTRAKT_ADRESİ";

// Yeni ABI fonksiyonları ekle
export const SpinAndWinV3ABI = [
  // ... mevcut ABI
  {
    "inputs": [],
    "name": "totalReservedForUsers",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "failedPayoutsTotal",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getContractStatus",
    "outputs": [
      {"internalType": "uint256", "name": "contractBalance", "type": "uint256"},
      {"internalType": "uint256", "name": "_prizePool", "type": "uint256"},
      {"internalType": "uint256", "name": "_jackpotPool", "type": "uint256"},
      {"internalType": "uint256", "name": "_ownerFees", "type": "uint256"},
      {"internalType": "uint256", "name": "_totalReservedForUsers", "type": "uint256"},
      {"internalType": "uint256", "name": "_failedPayoutsTotal", "type": "uint256"},
      {"internalType": "uint256", "name": "availableToWithdraw", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "withdrawAllFailedPayouts",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "emergencyWithdrawAll",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "withdrawExcessBalance",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];
```

### 4. Verify Contract (BaseScan)

```
https://basescan.org/verifyContract
→ Contract Address: YENİ_ADRES
→ Compiler: 0.8.19
→ Optimization: Yes (200)
→ License: MIT
→ Constructor Arguments: (automatic)
```

## Test Checklist

- [ ] Spin works
- [ ] VRF callback works
- [ ] Claim works
- [ ] Prize pool updates correctly
- [ ] Jackpot pool updates correctly
- [ ] Owner fees accumulate
- [ ] getContractStatus() returns correct values
- [ ] Failed payouts tracking works (test with a contract that rejects ETH)
- [ ] Emergency functions work

## Yeni Owner Fonksiyonları

```javascript
// Kontrakt durumunu gör
const status = await contract.getContractStatus();
console.log({
  balance: status.contractBalance,
  prizePool: status._prizePool,
  jackpotPool: status._jackpotPool,
  ownerFees: status._ownerFees,
  reserved: status._totalReservedForUsers,
  failed: status._failedPayoutsTotal,
  available: status.availableToWithdraw
});

// Başarısız ödemeleri çek
if (status._failedPayoutsTotal > 0) {
  await contract.withdrawAllFailedPayouts();
}

// Acil durum - tüm parayı çek
await contract.emergencyWithdrawAll();
```

## Güvenlik Notları

⚠️ **Migration sırasında**:
1. Eski kontraktı pause edin
2. Tüm pending işlemlerin tamamlanmasını bekleyin
3. Kullanıcılara duyuru yapın
4. Havuzları güvenli bir şekilde transfer edin
5. Yeni kontraktı test edin
6. Frontend'i güncelleyin
7. Announce yeni kontrakt adresini

🔒 **Güvenlik**:
- Private key'lerinizi güvende tutun
- Multi-sig wallet kullanmayı düşünün
- Önce testnet'te deneyin
- Verify'ı unutmayın

