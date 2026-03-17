import { ethers } from "hardhat";
import { resolveDid } from "./did-resolver";

/**
 * Full lifecycle demo: ACK-ID to ERC-8004 Identity Bridge
 *
 * 1. Deploy the SimpleAgentRegistry
 * 2. Resolve a did:web identity (mock)
 * 3. Register the agent on-chain
 * 4. Simulate an ACK-Pay transaction
 * 5. Submit reputation signals
 * 6. Query the agent's reputation by DID
 *
 * Usage:
 *   npx hardhat run src/demo.ts --network localhost
 */
async function main() {
  const [deployer, otherAgent] = await ethers.getSigners();

  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║   ACK-ERC8004 Identity Bridge — Full Demo       ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  // ─── Step 1: Deploy Registry ───────────────────────────────────
  console.log("Step 1: Deploy SimpleAgentRegistry\n");

  const Registry = await ethers.getContractFactory("SimpleAgentRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();

  const registryAddress = await registry.getAddress();
  console.log(`  Registry deployed to: ${registryAddress}\n`);

  // ─── Step 2: Resolve DID ───────────────────────────────────────
  console.log("Step 2: Resolve did:web identity\n");

  const did = "did:web:agent.example.com";
  const didDocument = resolveDid(did);

  console.log(`  DID: ${did}`);
  console.log(`  Resolved DID Document:`);
  console.log(`    ID: ${didDocument.id}`);
  console.log(`    Service: ${didDocument.service?.[0]?.type ?? "none"}\n`);

  // ─── Step 3: Register Agent ────────────────────────────────────
  console.log("Step 3: Register agent on ERC-8004 registry\n");

  const metadata = JSON.stringify({
    name: "Demo AI Agent",
    description: "An agent that processes payments via ACK-Pay",
    capabilities: ["payments", "invoicing", "data-retrieval"],
    didDocument: didDocument,
  });

  const registerTx = await registry.registerAgent(
    deployer.address,
    did,
    metadata
  );
  const registerReceipt = await registerTx.wait();

  const agentId = await registry.resolveAgent(did);
  console.log(`  Agent registered!`);
  console.log(`  Agent ID: ${agentId}`);
  console.log(`  Address:  ${deployer.address}`);
  console.log(`  DID:      ${did}\n`);

  // ─── Step 4: Simulate ACK-Pay Transaction ──────────────────────
  console.log("Step 4: Simulate ACK-Pay transaction\n");

  const ackPayTransaction = {
    id: `ack-pay-${Date.now()}`,
    from: deployer.address,
    to: otherAgent.address,
    amount: "100.00",
    currency: "USDC",
    status: "completed",
    timestamp: new Date().toISOString(),
  };

  console.log(`  Transaction ID: ${ackPayTransaction.id}`);
  console.log(`  From: ${ackPayTransaction.from}`);
  console.log(`  To:   ${ackPayTransaction.to}`);
  console.log(`  Amount: ${ackPayTransaction.amount} ${ackPayTransaction.currency}`);
  console.log(`  Status: ${ackPayTransaction.status}\n`);

  // ─── Step 5: Submit Reputation Signals ─────────────────────────
  console.log("Step 5: Submit reputation signals\n");

  // Signal 1: Payment completed
  const signal1Tx = await registry.submitSignal(
    agentId,
    "payment_completed",
    10,
    JSON.stringify({ txId: ackPayTransaction.id, amount: ackPayTransaction.amount })
  );
  await signal1Tx.wait();
  console.log(`  [+10] payment_completed — transaction ${ackPayTransaction.id}`);

  // Signal 2: Receipt verified
  const signal2Tx = await registry.submitSignal(
    agentId,
    "receipt_verified",
    5,
    JSON.stringify({ txId: ackPayTransaction.id, verifiedBy: "ack-receipt-service" })
  );
  await signal2Tx.wait();
  console.log(`  [+5]  receipt_verified — verified by ack-receipt-service`);

  // Simulate a second transaction
  const ackPayTx2Id = `ack-pay-${Date.now() + 1}`;
  const signal3Tx = await registry.submitSignal(
    agentId,
    "payment_completed",
    10,
    JSON.stringify({ txId: ackPayTx2Id, amount: "50.00" })
  );
  await signal3Tx.wait();
  console.log(`  [+10] payment_completed — transaction ${ackPayTx2Id}`);

  // Simulate a dispute (negative signal)
  const signal4Tx = await registry.submitSignal(
    agentId,
    "dispute_filed",
    -15,
    JSON.stringify({ txId: ackPayTx2Id, reason: "Service not delivered" })
  );
  await signal4Tx.wait();
  console.log(`  [-15] dispute_filed — service not delivered\n`);

  // ─── Step 6: Query Reputation ──────────────────────────────────
  console.log("Step 6: Query agent reputation by DID\n");

  const queryDid = "did:web:agent.example.com";
  const resolvedAgentId = await registry.resolveAgent(queryDid);

  console.log(`  Resolving: ${queryDid}`);
  console.log(`  Agent ID:  ${resolvedAgentId}`);

  const [score, signalCount] = await registry.getReputation(resolvedAgentId);

  console.log(`\n  ┌─────────────────────────────────┐`);
  console.log(`  │  Reputation Summary              │`);
  console.log(`  ├─────────────────────────────────┤`);
  console.log(`  │  Score:        ${String(score).padEnd(17)}│`);
  console.log(`  │  Signal Count: ${String(signalCount).padEnd(17)}│`);
  console.log(`  └─────────────────────────────────┘`);

  console.log(`\n  Signal History:`);
  for (let i = 0; i < Number(signalCount); i++) {
    const [signalType, value, signalMeta, timestamp] =
      await registry.getSignal(resolvedAgentId, i);
    const sign = value > 0n ? "+" : "";
    console.log(`    [${i}] ${signalType}: ${sign}${value}`);
  }

  console.log("\n--- Demo complete ---");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
