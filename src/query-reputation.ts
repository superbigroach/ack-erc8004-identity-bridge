import { ethers } from "hardhat";

/**
 * Query an agent's reputation by DID.
 *
 * Flow: DID -> resolveAgent -> agentId -> getReputation -> score + signal count
 *
 * Usage:
 *   npx hardhat run src/query-reputation.ts --network localhost
 */
async function main() {
  const [deployer] = await ethers.getSigners();

  // Deploy, register, and submit some signals for standalone demo
  const Registry = await ethers.getContractFactory("SimpleAgentRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();

  const did = "did:web:example.com";

  // Setup: register agent and submit a few signals
  await (
    await registry.registerAgent(
      deployer.address,
      did,
      JSON.stringify({ name: "Example Agent" })
    )
  ).wait();

  const agentId = await registry.resolveAgent(did);

  // Submit multiple signals to build up a reputation
  await (
    await registry.submitSignal(
      agentId,
      "payment_completed",
      10,
      JSON.stringify({ txId: "tx-001" })
    )
  ).wait();

  await (
    await registry.submitSignal(
      agentId,
      "receipt_verified",
      5,
      JSON.stringify({ txId: "tx-001" })
    )
  ).wait();

  await (
    await registry.submitSignal(
      agentId,
      "payment_completed",
      10,
      JSON.stringify({ txId: "tx-002" })
    )
  ).wait();

  // --- Query flow starts here ---
  console.log("=== Query Agent Reputation by DID ===\n");

  const queryDid = "did:web:example.com";
  console.log(`Resolving DID: ${queryDid}`);

  const resolvedId = await registry.resolveAgent(queryDid);

  if (resolvedId === 0n) {
    console.log("Agent not found for this DID.");
    return;
  }

  console.log(`Resolved to agent ID: ${resolvedId}`);

  // Get agent details
  const [agentAddress, agentDid, agentMetadata] =
    await registry.getAgent(resolvedId);
  console.log(`\nAgent Details:`);
  console.log(`  Address:  ${agentAddress}`);
  console.log(`  DID:      ${agentDid}`);
  console.log(`  Metadata: ${agentMetadata}`);

  // Get reputation
  const [score, signalCount] = await registry.getReputation(resolvedId);
  console.log(`\nReputation:`);
  console.log(`  Score:        ${score}`);
  console.log(`  Signal count: ${signalCount}`);

  // List individual signals
  console.log(`\nSignal History:`);
  for (let i = 0; i < Number(signalCount); i++) {
    const [signalType, value, metadata, timestamp] =
      await registry.getSignal(resolvedId, i);
    console.log(`  [${i}] ${signalType}: ${value > 0n ? "+" : ""}${value} (${metadata})`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
