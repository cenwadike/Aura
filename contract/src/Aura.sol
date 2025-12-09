// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/**
 * @title Aura Protocol - AI Avatar State Management
 * @notice Manages AI Avatar templates, instances, and state on Avalanche C-Chain
 * @dev Designed for integration with x402 micropayment protocol
 */
contract Aura {
    // ==================== Structs ====================

    struct Template {
        address creator;
        uint256 templateId;
        string name;
        string baseBehavior;
        uint256 createdAt;
        bool exists;
    }

    struct Memory {
        string data;
        uint256 lastUpdated;
    }

    struct State {
        address creator;
        uint256 avatarId;
        uint256 sessionId;
        uint256 templateId;
        string dialogue;
        string behavior;
        uint256 lastInteraction;
        bool exists;
    }

    // ==================== State Variables ====================

    // Core storage
    mapping(bytes32 => Template) public templates;
    mapping(bytes32 => Memory) public memories;
    mapping(bytes32 => State) public states;

    // Per-user counters
    uint256 public templateCount;
    mapping(address => uint256) public userAvatarCount;
    mapping(address => uint256) public userSessionCount;

    // User mappings for enumeration
    mapping(address => uint256[]) public userTemplates;
    mapping(address => uint256[]) public userAvatars;
    mapping(address => uint256[]) public userSessions;

    // Reverse lookups
    mapping(bytes32 => uint256) public sessionToAvatar;

    address public owner;
    address public platformTreasury;

    // ==================== Events ====================

    event TemplateCreated(
        uint256 indexed templateId,
        address indexed creator,
        string name,
        string baseBehavior
    );

    event AvatarInitialized(
        uint256 indexed avatarId,
        uint256 indexed sessionId,
        address indexed creator,
        uint256 templateId
    );

    event AvatarUpdated(
        uint256 indexed avatarId,
        uint256 indexed sessionId,
        address indexed creator,
        string action,
        string dialogue,
        string behavior
    );

    // ==================== Errors ====================

    error NotCreator();
    error TemplateNotFound();
    error AvatarNotFound();
    error InvalidInput();
    error Unauthorized();

    // ==================== Modifiers ====================

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    // ==================== Constructor ====================

    constructor(address _platformTreasury) {
        owner = msg.sender;
        platformTreasury = _platformTreasury;
    }

    // ==================== Core Functions ====================

    /**
     * @notice Creates a new AI Avatar template
     * @param name Human-readable template name
     * @param baseBehavior Default behavior description
     * @return templateId The generated template ID
     */
    function createTemplate(
        string calldata name,
        string calldata baseBehavior
    ) external returns (uint256) {
        if (bytes(name).length == 0) revert InvalidInput();

        uint256 templateId = ++templateCount;
        bytes32 templateHash = _keccak(abi.encodePacked(templateId));

        templates[templateHash] = Template({
            creator: msg.sender,
            templateId: templateId,
            name: name,
            baseBehavior: baseBehavior,
            createdAt: block.timestamp,
            exists: true
        });

        userTemplates[msg.sender].push(templateId);

        emit TemplateCreated(templateId, msg.sender, name, baseBehavior);

        return templateId;
    }

    /**
     * @notice Initializes a new Avatar instance with a new session
     * @param templateId Template to use for this Avatar
     * @return avatarId The generated avatar ID (scoped to user)
     * @return sessionId The generated session ID (scoped to user)
     */
    function initializeAvatar(
        address forUser,
        uint256 templateId
    ) external returns (uint256 avatarId, uint256 sessionId) {
        bytes32 templateHash = _keccak(abi.encodePacked(templateId));
        if (!templates[templateHash].exists) revert TemplateNotFound();

        // Create new session (user-scoped)
        sessionId = ++userSessionCount[forUser];
        userSessions[forUser].push(sessionId);

        // Create new avatar (user-scoped)
        avatarId = ++userAvatarCount[forUser];

        bytes32 avatarHash = _keccak(abi.encodePacked(forUser, avatarId));
        bytes32 sessionHash = _keccak(abi.encodePacked(forUser, sessionId));

        memories[avatarHash] = Memory({data: "", lastUpdated: block.timestamp});

        states[avatarHash] = State({
            creator: forUser,
            avatarId: avatarId,
            sessionId: sessionId,
            templateId: templateId,
            dialogue: "",
            behavior: templates[templateHash].baseBehavior,
            lastInteraction: block.timestamp,
            exists: true
        });

        userAvatars[forUser].push(avatarId);
        sessionToAvatar[sessionHash] = avatarId;

        emit AvatarInitialized(avatarId, sessionId, forUser, templateId);

        return (avatarId, sessionId);
    }

    /**
     * @notice Updates avatar state and memory
     * @param avatarId Avatar identifier (user-scoped)
     * @param action Player action/input
     * @param dialogue AI-generated dialogue
     * @param behavior AI-generated behavior state
     */
    function updateAvatar(
        address forUser,
        uint256 avatarId,
        string calldata action,
        string calldata dialogue,
        string calldata behavior
    ) external returns (uint256) {
        bytes32 avatarHash = _keccak(abi.encodePacked(forUser, avatarId));

        if (!states[avatarHash].exists) revert AvatarNotFound();

        Memory storage memory_ = memories[avatarHash];
        State storage state = states[avatarHash];

        // Append action to memory with timestamp
        string memory newEntry = string(
            abi.encodePacked(
                memory_.data,
                bytes(memory_.data).length > 0 ? "," : "",
                action,
                "@",
                _toString(block.timestamp)
            )
        );

        memory_.data = newEntry;
        memory_.lastUpdated = block.timestamp;

        state.dialogue = dialogue;
        state.behavior = behavior;
        state.lastInteraction = block.timestamp;

        emit AvatarUpdated(
            avatarId,
            state.sessionId,
            forUser,
            action,
            dialogue,
            behavior
        );

        return avatarId;
    }

    // ==================== View Functions ====================

    function getTemplate(
        uint256 templateId
    ) external view returns (Template memory) {
        bytes32 templateHash = _keccak(abi.encodePacked(templateId));
        if (!templates[templateHash].exists) revert TemplateNotFound();
        return templates[templateHash];
    }

    function getState(
        address user,
        uint256 avatarId
    ) external view returns (State memory) {
        bytes32 avatarHash = _keccak(abi.encodePacked(user, avatarId));
        if (!states[avatarHash].exists) revert AvatarNotFound();
        return states[avatarHash];
    }

    function getMemory(
        address user,
        uint256 avatarId
    ) external view returns (Memory memory) {
        bytes32 avatarHash = _keccak(abi.encodePacked(user, avatarId));
        if (!states[avatarHash].exists) revert AvatarNotFound();
        return memories[avatarHash];
    }

    function getTemplateCreator(
        uint256 templateId
    ) external view returns (address) {
        bytes32 templateHash = _keccak(abi.encodePacked(templateId));
        if (!templates[templateHash].exists) return platformTreasury;
        return templates[templateHash].creator;
    }

    function getUserTemplates(
        address user
    ) external view returns (uint256[] memory) {
        return userTemplates[user];
    }

    function getUserAvatars(
        address user
    ) external view returns (uint256[] memory) {
        return userAvatars[user];
    }

    function getUserSessions(
        address user
    ) external view returns (uint256[] memory) {
        return userSessions[user];
    }

    function getAvatarBySession(
        address user,
        uint256 sessionId
    ) external view returns (uint256) {
        bytes32 sessionHash = _keccak(abi.encodePacked(user, sessionId));
        return sessionToAvatar[sessionHash];
    }

    function getUserAvatarCount(address user) external view returns (uint256) {
        return userAvatarCount[user];
    }

    function getUserSessionCount(address user) external view returns (uint256) {
        return userSessionCount[user];
    }

    // ==================== Admin Functions ====================

    function setPlatformTreasury(address _newTreasury) external onlyOwner {
        if (_newTreasury == address(0)) revert InvalidInput();
        platformTreasury = _newTreasury;
    }

    // ==================== Utility Functions ====================

    /// @dev Efficient keccak256 over arbitrary bytes using inline assembly
    function _keccak(bytes memory data) internal pure returns (bytes32 h) {
        assembly {
            h := keccak256(add(data, 32), mload(data))
        }
    }

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";

        uint256 temp = value;
        uint256 digits;

        while (temp != 0) {
            digits++;
            temp /= 10;
        }

        bytes memory buffer = new bytes(digits);

        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }

        return string(buffer);
    }
}
