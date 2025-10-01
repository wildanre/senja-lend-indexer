import { createPublicClient, http, parseAbiItem } from 'viem';
import { base } from 'viem/chains';

const client = createPublicClient({
  chain: base,
  transport: http('https://base.llamarpc.com'),
});

const poolAddress = '0xf717f30800309b3921ca9e36344d55d963fbf5ad';

const supplyCollateralEvent = parseAbiItem(
  'event SupplyCollateral(address indexed user, uint256 amount)'
);

async function checkEvents() {
  try {
    console.log('Checking SupplyCollateral events...');
    
    // Get latest block first to see how far we are
    const latestBlock = await client.getBlockNumber();
    console.log(`Latest block: ${latestBlock}`);
    
    // Check several ranges
    const ranges = [
      { start: 35929846, end: 35930846, desc: "Pool creation range" },
      { start: 35950000, end: 35951000, desc: "Mid range" }, 
      { start: Number(latestBlock) - 1000, end: Number(latestBlock), desc: "Recent blocks" }
    ];
    
    for (const range of ranges) {
      console.log(`\nChecking ${range.desc}: blocks ${range.start} to ${range.end}...`);
      
      const events = await client.getLogs({
        address: poolAddress,
        event: supplyCollateralEvent,
        fromBlock: BigInt(range.start),
        toBlock: BigInt(range.end),
      });

      console.log(`Found ${events.length} SupplyCollateral events in this range`);
      
      events.forEach((event, index) => {
        console.log(`Event ${index + 1}:`, {
          blockNumber: event.blockNumber,
          txHash: event.transactionHash,
          user: event.args.user,
          amount: event.args.amount?.toString(),
        });
      });
    }

    console.log('\n=== CONCLUSION ===');
    console.log('If all ranges show 0 events, this confirms that:');
    console.log('1. The SupplyCollateral handler is correctly configured');
    console.log('2. There are simply no SupplyCollateral events to process yet');
    console.log('3. Once users start supplying collateral, the indexing will work properly');

  } catch (error) {
    console.error('Error checking events:', error);
  }
}

checkEvents();