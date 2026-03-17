import { expect } from "chai";
import { ethers } from "hardhat";
import { SimpleAgentRegistry } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("SimpleAgentRegistry", function () {
  let registry: SimpleAgentRegistry;
  let owner: HardhatEthersSigner;
  let agent1: HardhatEthersSigner;
  let agent2: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, agent1, agent2] = await ethers.getSigners();

    const Registry = await ethers.getContractFactory("SimpleAgentRegistry");
    registry = await Registry.deploy();
    await registry.waitForDeployment();
  });

  describe("registerAgent", function () {
    it("should register an agent and return an agent ID", async function () {
      const did = "did:web:agent1.example.com";
      const metadata = JSON.stringify({ name: "Agent 1" });

      const tx = await registry.registerAgent(agent1.address, did, metadata);
      const receipt = await tx.wait();

      const agentId = await registry.resolveAgent(did);
      expect(agentId).to.equal(1n);
    });

    it("should emit AgentRegistered event", async function () {
      const did = "did:web:agent1.example.com";
      const metadata = JSON.stringify({ name: "Agent 1" });

      await expect(registry.registerAgent(agent1.address, did, metadata))
        .to.emit(registry, "AgentRegistered")
        .withArgs(1n, agent1.address, did);
    });

    it("should assign sequential agent IDs", async function () {
      await registry.registerAgent(
        agent1.address,
        "did:web:agent1.example.com",
        "{}"
      );
      await registry.registerAgent(
        agent2.address,
        "did:web:agent2.example.com",
        "{}"
      );

      const id1 = await registry.resolveAgent("did:web:agent1.example.com");
      const id2 = await registry.resolveAgent("did:web:agent2.example.com");

      expect(id1).to.equal(1n);
      expect(id2).to.equal(2n);
    });

    it("should reject zero address", async function () {
      await expect(
        registry.registerAgent(ethers.ZeroAddress, "did:web:test.com", "{}")
      ).to.be.revertedWith("Agent address cannot be zero");
    });

    it("should reject empty DID", async function () {
      await expect(
        registry.registerAgent(agent1.address, "", "{}")
      ).to.be.revertedWith("DID cannot be empty");
    });

    it("should reject duplicate DID", async function () {
      const did = "did:web:agent1.example.com";
      await registry.registerAgent(agent1.address, did, "{}");

      await expect(
        registry.registerAgent(agent2.address, did, "{}")
      ).to.be.revertedWith("DID already registered");
    });

    it("should store agent metadata correctly", async function () {
      const did = "did:web:agent1.example.com";
      const metadata = JSON.stringify({
        name: "Agent 1",
        capabilities: ["payments"],
      });

      await registry.registerAgent(agent1.address, did, metadata);
      const agentId = await registry.resolveAgent(did);

      const [addr, storedDid, storedMetadata] =
        await registry.getAgent(agentId);
      expect(addr).to.equal(agent1.address);
      expect(storedDid).to.equal(did);
      expect(storedMetadata).to.equal(metadata);
    });
  });

  describe("submitSignal", function () {
    let agentId: bigint;

    beforeEach(async function () {
      await registry.registerAgent(
        agent1.address,
        "did:web:agent1.example.com",
        "{}"
      );
      agentId = await registry.resolveAgent("did:web:agent1.example.com");
    });

    it("should submit a positive signal", async function () {
      await registry.submitSignal(
        agentId,
        "payment_completed",
        10,
        JSON.stringify({ txId: "tx-001" })
      );

      const [score, count] = await registry.getReputation(agentId);
      expect(score).to.equal(10n);
      expect(count).to.equal(1n);
    });

    it("should submit a negative signal", async function () {
      await registry.submitSignal(
        agentId,
        "dispute_filed",
        -5,
        JSON.stringify({ reason: "late delivery" })
      );

      const [score, count] = await registry.getReputation(agentId);
      expect(score).to.equal(-5n);
      expect(count).to.equal(1n);
    });

    it("should accumulate multiple signals", async function () {
      await registry.submitSignal(agentId, "payment_completed", 10, "{}");
      await registry.submitSignal(agentId, "receipt_verified", 5, "{}");
      await registry.submitSignal(agentId, "dispute_filed", -3, "{}");

      const [score, count] = await registry.getReputation(agentId);
      // Production implementations should use application-specific reputation algorithms.
      // This demo uses simple summation for clarity.
      expect(score).to.equal(12n); // 10 + 5 + (-3)
      expect(count).to.equal(3n);
    });

    it("should emit SignalSubmitted event", async function () {
      await expect(
        registry.submitSignal(agentId, "payment_completed", 10, "{}")
      )
        .to.emit(registry, "SignalSubmitted")
        .withArgs(agentId, "payment_completed", 10);
    });

    it("should reject signal for non-existent agent", async function () {
      await expect(
        registry.submitSignal(999, "payment_completed", 10, "{}")
      ).to.be.revertedWith("Agent does not exist");
    });

    it("should reject empty signal type", async function () {
      await expect(
        registry.submitSignal(agentId, "", 10, "{}")
      ).to.be.revertedWith("Signal type cannot be empty");
    });

    it("should store signal details correctly", async function () {
      const meta = JSON.stringify({ txId: "tx-001" });
      await registry.submitSignal(agentId, "payment_completed", 10, meta);

      const [signalType, value, metadata, timestamp] =
        await registry.getSignal(agentId, 0);
      expect(signalType).to.equal("payment_completed");
      expect(value).to.equal(10n);
      expect(metadata).to.equal(meta);
      expect(timestamp).to.be.greaterThan(0n);
    });
  });

  describe("getReputation", function () {
    it("should return zero for a newly registered agent", async function () {
      await registry.registerAgent(
        agent1.address,
        "did:web:agent1.example.com",
        "{}"
      );
      const agentId = await registry.resolveAgent("did:web:agent1.example.com");

      const [score, count] = await registry.getReputation(agentId);
      expect(score).to.equal(0n);
      expect(count).to.equal(0n);
    });

    it("should revert for non-existent agent", async function () {
      await expect(registry.getReputation(999)).to.be.revertedWith(
        "Agent does not exist"
      );
    });
  });

  describe("resolveAgent", function () {
    it("should return agent ID for registered DID", async function () {
      await registry.registerAgent(
        agent1.address,
        "did:web:agent1.example.com",
        "{}"
      );

      const agentId = await registry.resolveAgent("did:web:agent1.example.com");
      expect(agentId).to.equal(1n);
    });

    it("should return 0 for unregistered DID", async function () {
      const agentId = await registry.resolveAgent(
        "did:web:unknown.example.com"
      );
      expect(agentId).to.equal(0n);
    });
  });

  describe("getSignal", function () {
    it("should revert for out-of-bounds index", async function () {
      await registry.registerAgent(
        agent1.address,
        "did:web:agent1.example.com",
        "{}"
      );
      const agentId = await registry.resolveAgent("did:web:agent1.example.com");

      await expect(registry.getSignal(agentId, 0)).to.be.revertedWith(
        "Signal index out of bounds"
      );
    });

    it("should revert for non-existent agent", async function () {
      await expect(registry.getSignal(999, 0)).to.be.revertedWith(
        "Agent does not exist"
      );
    });
  });
});
