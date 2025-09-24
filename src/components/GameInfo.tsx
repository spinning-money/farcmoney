import React from 'react';

interface GameInfoProps {
  totalPool: string;
  jackpot: string;
}

const GameInfo: React.FC<GameInfoProps> = ({ totalPool, jackpot }) => {

  return (
    <div className="w-full max-w-4xl mx-auto px-3 pb-6">
      {/* Main Info Panel */}
      <div className="bg-gradient-to-br from-slate-800/80 via-slate-900/90 to-slate-800/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-emerald-600/20 border-b border-white/10 px-4 py-3">
          <div className="flex items-center justify-center gap-2">
            <div className="text-xl">🎰</div>
            <h2 className="text-lg font-bold text-white">Game Info</h2>
            <div className="text-xl">💰</div>
          </div>
        </div>

        <div className="p-4 space-y-4">

          {/* Chainlink VRF Section */}
          <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/20 rounded-xl p-3 border border-orange-500/20">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">🔗</span>
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Provably Fair</h3>
                <p className="text-orange-200/70 text-xs">Powered by Chainlink VRF</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="bg-orange-500/20 rounded-lg p-2 border border-orange-500/30">
                <div className="text-orange-300 font-semibold">Verifiable</div>
                <div className="text-orange-200/70">On-chain randomness</div>
              </div>
              <div className="bg-orange-500/20 rounded-lg p-2 border border-orange-500/30">
                <div className="text-orange-300 font-semibold">Tamper-proof</div>
                <div className="text-orange-200/70">No manipulation possible</div>
              </div>
              <div className="bg-orange-500/20 rounded-lg p-2 border border-orange-500/30">
                <div className="text-orange-300 font-semibold">Decentralized</div>
                <div className="text-orange-200/70">Oracle network secured</div>
              </div>
            </div>
          </div>

          {/* Motivational Message */}
          <div className="bg-gradient-to-br from-green-500/10 to-green-600/20 rounded-xl p-3 border border-green-500/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xs">🚀</span>
              </div>
              <h3 className="text-white font-semibold text-sm">The More You Play</h3>
            </div>
            <p className="text-green-200/80 text-xs leading-relaxed">
              The more spins, the bigger the pools grow! Every player contributes to making the rewards more exciting and valuable. Join the fun and watch the jackpots soar! 🎉
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default GameInfo; 
