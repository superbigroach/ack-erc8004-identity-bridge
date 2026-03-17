import { ethers } from "hardhat";

/**
 * Register an agent's DID on the ERC-8004 registry.
 *
 * Usage:
 *   npx hardhat run src/register-agent.ts --network localhost
 *
 * In production, the DID and contract address would come from
 * environment variables or CLI arguments.
 */
async function main() {
  const [deployer] = await ethers.getSigners();

  // For standalone usage, deploy a fresh registry.
  // In production, you would attach to an existing deployment.
  const Registry = await ethers.getContractFactory("SimpleAgentRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();

  const registryAddress = await registry.getAddress();
  console.log("SimpleAgentRegistry deployed to:", registryAddress);

  // Register an agent with a did:web identifier
  const did = "did:web:example.com";
  const metadata = JSON.stringify({
    name: "Example Agent",
    description: "A demo AI agent",
    capabilities: ["payments", "data-retrieval"],
  });

  console.log(`\nRegistering agent with DID: ${did}`);

  const tx = await registry.registerAgent(deployer.address, did, metadata);
  const receipt = await tx.wait();

  // Parse the AgentRegistered event
  const event = receipt?.logs
    .map((log: any) => {
      try {
        return registry.interface.parseLog({ topics: log.topics as string[], data: log.data });
      } catch {
        return null;
      }
    })
    .find((e: any) => e?.name === "AgentRegistered");

  if (event) {
    console.log(`Agent registered successfully!`);
    console.log(`  Agent ID: ${event.args.agentId}`);
    console.log(`  Address:  ${event.args.agent}`);
    console.log(`  DID:      ${event.args.did}`);
  }

  // Verify by resolving the DID back to an agent ID
  const agentId = await registry.resolveAgent(did);
  console.log(`\nVerification: resolveAgent("${did}") => agentId ${agentId}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
