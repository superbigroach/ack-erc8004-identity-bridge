import { ethers } from "hardhat";

/**
 * Submit a reputation signal to the ERC-8004 registry after an ACK-Pay
 * transaction completes.
 *
 * Signal types:
 *   - "payment_completed" — ACK-Pay transaction completed successfully
 *   - "receipt_verified"  — Payment receipt was verified
 *   - "dispute_filed"     — A dispute was filed (typically negative)
 *
 * Usage:
 *   npx hardhat run src/submit-reputation-signal.ts --network localhost
 */
async function main() {
  const [deployer] = await ethers.getSigners();

  // Deploy and register for standalone demo
  const Registry = await ethers.getContractFactory("SimpleAgentRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();

  const did = "did:web:example.com";
  const registerTx = await registry.registerAgent(
    deployer.address,
    did,
    JSON.stringify({ name: "Example Agent" })
  );
  await registerTx.wait();

  const agentId = await registry.resolveAgent(did);
  console.log(`Agent registered with ID: ${agentId}`);

  // Simulate an ACK-Pay transaction completing
  console.log("\n--- Simulating ACK-Pay transaction ---");
  const mockTxId = `ack-pay-${Date.now()}`;
  console.log(`Transaction ID: ${mockTxId}`);
  console.log("Status: completed");

  // Submit a positive signal for the completed payment
  console.log("\n--- Submitting reputation signal ---");
  const signalType = "payment_completed";
  const signalValue = 10; // Positive signal
  const signalMetadata = JSON.stringify({
    txId: mockTxId,
    amount: "50.00",
    currency: "USDC",
    timestamp: new Date().toISOString(),
  });

  const signalTx = await registry.submitSignal(
    agentId,
    signalType,
    signalValue,
    signalMetadata
  );
  await signalTx.wait();

  console.log(`Signal submitted: ${signalType} = +${signalValue}`);

  // Check updated reputation
  const [score, signalCount] = await registry.getReputation(agentId);
  console.log(`\nUpdated reputation for agent ${agentId}:`);
  console.log(`  Score: ${score}`);
  console.log(`  Signal count: ${signalCount}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
