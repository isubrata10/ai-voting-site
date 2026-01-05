const crypto = require('crypto');
const winston = require('winston');

class BlockchainService {
  constructor() {
    this.chain = [];
    this.pendingVotes = [];
    this.difficulty = 4;
    this.miningReward = 1;
    
    // Create genesis block
    this.createGenesisBlock();
  }

  createGenesisBlock() {
    const genesisBlock = {
      index: 0,
      timestamp: Date.now(),
      votes: [],
      previousHash: '0',
      hash: this.calculateHash(0, Date.now(), [], '0'),
      nonce: 0
    };
    
    this.chain.push(genesisBlock);
    winston.info('Genesis block created');
  }

  calculateHash(index, timestamp, votes, previousHash, nonce) {
    const data = index + timestamp + JSON.stringify(votes) + previousHash + nonce;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  async addVote(voteData) {
    try {
      // Add vote to pending transactions
      this.pendingVotes.push({
        ...voteData,
        timestamp: Date.now(),
        voteId: `VOTE-${crypto.randomBytes(8).toString('hex').toUpperCase()}`
      });
      
      // If we have enough votes, mine a new block
      if (this.pendingVotes.length >= 10) {
        await this.minePendingVotes();
      }
      
      // Return vote receipt
      const vote = this.pendingVotes[this.pendingVotes.length - 1];
      
      return {
        success: true,
        transactionId: vote.voteId,
        blockNumber: this.chain.length,
        timestamp: vote.timestamp,
        status: 'pending_confirmation'
      };
      
    } catch (error) {
      winston.error(`Blockchain Error: ${error.message}`);
      throw new Error('Failed to record vote on blockchain');
    }
  }

  async minePendingVotes() {
    if (this.pendingVotes.length === 0) return;
    
    const block = {
      index: this.chain.length,
      timestamp: Date.now(),
      votes: [...this.pendingVotes],
      previousHash: this.getLatestBlock().hash,
      nonce: 0
    };
    
    // Proof of Work
    winston.info(`Mining block ${block.index} with ${block.votes.length} votes...`);
    
    let hash = this.calculateHash(
      block.index,
      block.timestamp,
      block.votes,
      block.previousHash,
      block.nonce
    );
    
    while (hash.substring(0, this.difficulty) !== '0'.repeat(this.difficulty)) {
      block.nonce++;
      hash = this.calculateHash(
        block.index,
        block.timestamp,
        block.votes,
        block.previousHash,
        block.nonce
      );
    }
    
    block.hash = hash;
    
    // Add block to chain
    this.chain.push(block);
    
    // Clear pending votes
    this.pendingVotes = [];
    
    winston.info(`Block ${block.index} mined successfully. Hash: ${hash.substring(0, 16)}...`);
    
    // Notify subscribers about new block
    this.notifySubscribers(block);
    
    return block;
  }

  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];
      
      // Verify current block's hash
      const calculatedHash = this.calculateHash(
        currentBlock.index,
        currentBlock.timestamp,
        currentBlock.votes,
        currentBlock.previousHash,
        currentBlock.nonce
      );
      
      if (currentBlock.hash !== calculatedHash) {
        return false;
      }
      
      // Verify chain linkage
      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }
    }
    
    return true;
  }

  getVoteHistory(voterId) {
    const votes = [];
    
    for (const block of this.chain) {
      for (const vote of block.votes) {
        if (vote.voterId === voterId) {
          votes.push({
            ...vote,
            blockNumber: block.index,
            blockHash: block.hash.substring(0, 16) + '...',
            minedAt: block.timestamp
          });
        }
      }
    }
    
    return votes;
  }

  getChainStats() {
    return {
      blocks: this.chain.length,
      totalVotes: this.chain.reduce((sum, block) => sum + block.votes.length, 0),
      pendingVotes: this.pendingVotes.length,
      chainValid: this.isChainValid(),
      latestBlock: this.getLatestBlock().index,
      latestBlockHash: this.getLatestBlock().hash.substring(0, 16) + '...'
    };
  }

  // WebSocket notification system
  notifySubscribers(block) {
    // This would be connected to Socket.io in production
    // For now, just log
    winston.info(`New block mined: ${block.index} with ${block.votes.length} votes`);
  }
}

module.exports = new BlockchainService();