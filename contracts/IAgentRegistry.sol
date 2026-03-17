// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IAgentRegistry
 * @notice Minimal ERC-8004 interface for an on-chain agent reputation registry.
 * @dev Agents are identified by a uint256 agentId and linked to a DID string.
 */
interface IAgentRegistry {
    /// @notice Emitted when a new agent is registered.
    event AgentRegistered(uint256 indexed agentId, address indexed agent, string did);

    /// @notice Emitted when a reputation signal is submitted.
    event SignalSubmitted(uint256 indexed agentId, string signalType, int256 value);

    /**
     * @notice Register an agent with a DID and metadata.
     * @param agent The agent's Ethereum address.
     * @param did The agent's decentralized identifier (e.g., did:web:example.com).
     * @param metadata Arbitrary metadata (JSON string, IPFS hash, etc.).
     * @return agentId The unique ID assigned to this agent.
     */
    function registerAgent(
        address agent,
        string calldata did,
        string calldata metadata
    ) external returns (uint256 agentId);

    /**
     * @notice Submit a reputation signal for an agent.
     * @param agentId The agent's registry ID.
     * @param signalType The type of signal (e.g., "payment_completed").
     * @param value The signal value (positive or negative).
     * @param metadata Additional context for the signal.
     */
    function submitSignal(
        uint256 agentId,
        string calldata signalType,
        int256 value,
        string calldata metadata
    ) external;

    /**
     * @notice Get an agent's aggregated reputation.
     * @param agentId The agent's registry ID.
     * @return score The aggregated reputation score.
     * @return signalCount The total number of signals received.
     */
    function getReputation(uint256 agentId) external view returns (int256 score, uint256 signalCount);

    /**
     * @notice Resolve a DID to an agent ID.
     * @param did The decentralized identifier to resolve.
     * @return agentId The agent's registry ID (0 if not found).
     */
    function resolveAgent(string calldata did) external view returns (uint256 agentId);
}
