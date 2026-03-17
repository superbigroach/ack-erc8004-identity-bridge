// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./IAgentRegistry.sol";

/**
 * @title SimpleAgentRegistry
 * @notice Minimal implementation of the ERC-8004 agent registry interface.
 * @dev This is a teaching example for the ACK-ERC8004 Identity Bridge demo.
 *
 * Production implementations should use application-specific reputation algorithms.
 * This demo uses simple summation for clarity.
 */
contract SimpleAgentRegistry is IAgentRegistry {
    struct AgentRecord {
        address agent;
        string did;
        string metadata;
        bool exists;
    }

    struct Signal {
        string signalType;
        int256 value;
        string metadata;
        uint256 timestamp;
    }

    /// @notice Counter for generating agent IDs (starts at 1).
    uint256 private _nextAgentId = 1;

    /// @notice agentId => AgentRecord
    mapping(uint256 => AgentRecord) private _agents;

    /// @notice DID string => agentId
    mapping(string => uint256) private _didToAgentId;

    /// @notice agentId => array of signals
    mapping(uint256 => Signal[]) private _signals;

    /// @notice agentId => aggregated reputation score
    /// Production implementations should use application-specific reputation algorithms.
    /// This demo uses simple summation for clarity.
    mapping(uint256 => int256) private _reputationScores;

    /// @inheritdoc IAgentRegistry
    function registerAgent(
        address agent,
        string calldata did,
        string calldata metadata
    ) external override returns (uint256 agentId) {
        require(agent != address(0), "Agent address cannot be zero");
        require(bytes(did).length > 0, "DID cannot be empty");
        require(_didToAgentId[did] == 0, "DID already registered");

        agentId = _nextAgentId++;

        _agents[agentId] = AgentRecord({
            agent: agent,
            did: did,
            metadata: metadata,
            exists: true
        });

        _didToAgentId[did] = agentId;

        emit AgentRegistered(agentId, agent, did);
    }

    /// @inheritdoc IAgentRegistry
    function submitSignal(
        uint256 agentId,
        string calldata signalType,
        int256 value,
        string calldata metadata
    ) external override {
        require(_agents[agentId].exists, "Agent does not exist");
        require(bytes(signalType).length > 0, "Signal type cannot be empty");

        _signals[agentId].push(Signal({
            signalType: signalType,
            value: value,
            metadata: metadata,
            timestamp: block.timestamp
        }));

        // Production implementations should use application-specific reputation algorithms.
        // This demo uses simple summation for clarity.
        _reputationScores[agentId] += value;

        emit SignalSubmitted(agentId, signalType, value);
    }

    /// @inheritdoc IAgentRegistry
    function getReputation(uint256 agentId) external view override returns (int256 score, uint256 signalCount) {
        require(_agents[agentId].exists, "Agent does not exist");
        score = _reputationScores[agentId];
        signalCount = _signals[agentId].length;
    }

    /// @inheritdoc IAgentRegistry
    function resolveAgent(string calldata did) external view override returns (uint256 agentId) {
        agentId = _didToAgentId[did];
    }

    /**
     * @notice Get the full agent record.
     * @param agentId The agent's registry ID.
     */
    function getAgent(uint256 agentId) external view returns (
        address agent,
        string memory did,
        string memory metadata
    ) {
        require(_agents[agentId].exists, "Agent does not exist");
        AgentRecord storage record = _agents[agentId];
        return (record.agent, record.did, record.metadata);
    }

    /**
     * @notice Get a specific signal by index.
     * @param agentId The agent's registry ID.
     * @param index The signal index.
     */
    function getSignal(uint256 agentId, uint256 index) external view returns (
        string memory signalType,
        int256 value,
        string memory metadata,
        uint256 timestamp
    ) {
        require(_agents[agentId].exists, "Agent does not exist");
        require(index < _signals[agentId].length, "Signal index out of bounds");

        Signal storage signal = _signals[agentId][index];
        return (signal.signalType, signal.value, signal.metadata, signal.timestamp);
    }
}
