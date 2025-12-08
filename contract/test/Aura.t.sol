// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {Aura} from "../src/Aura.sol";

contract AuraTest is Test {
    Aura public aura;
    address public owner;
    address public treasury;
    address public user1;
    address public user2;

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

    function setUp() public {
        owner = address(this);
        treasury = makeAddr("treasury");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        aura = new Aura(treasury);
    }

    // ==================== Template Creation Tests ====================

    function test_CreateTemplate() public {
        vm.startPrank(user1);

        vm.expectEmit(true, true, false, true);
        emit TemplateCreated(1, user1, "Warrior", "Aggressive fighter");

        uint256 templateId = aura.createTemplate(
            "Warrior",
            "Aggressive fighter"
        );

        assertEq(templateId, 1);
        assertEq(aura.templateCount(), 1);

        Aura.Template memory template = aura.getTemplate(templateId);
        assertEq(template.creator, user1);
        assertEq(template.templateId, 1);
        assertEq(template.name, "Warrior");
        assertEq(template.baseBehavior, "Aggressive fighter");
        assertTrue(template.exists);

        vm.stopPrank();
    }

    function test_CreateMultipleTemplates() public {
        vm.startPrank(user1);

        uint256 template1 = aura.createTemplate("Warrior", "Aggressive");
        uint256 template2 = aura.createTemplate("Mage", "Uses magic");

        assertEq(template1, 1);
        assertEq(template2, 2);
        assertEq(aura.templateCount(), 2);

        uint256[] memory userTemplates = aura.getUserTemplates(user1);
        assertEq(userTemplates.length, 2);
        assertEq(userTemplates[0], 1);
        assertEq(userTemplates[1], 2);

        vm.stopPrank();
    }

    function test_CreateTemplate_EmptyName_Reverts() public {
        vm.startPrank(user1);

        vm.expectRevert(Aura.InvalidInput.selector);
        aura.createTemplate("", "Behavior");

        vm.stopPrank();
    }

    function test_GetTemplateCreator() public {
        vm.prank(user1);
        uint256 templateId = aura.createTemplate("Warrior", "Aggressive");

        address creator = aura.getTemplateCreator(templateId);
        assertEq(creator, user1);
    }

    function test_GetTemplateCreator_NonExistent_ReturnsTreasury() public view {
        address creator = aura.getTemplateCreator(999);
        assertEq(creator, treasury);
    }

    // ==================== Avatar Initialization Tests ====================

    function test_InitializeAvatar() public {
        vm.startPrank(user1);

        uint256 templateId = aura.createTemplate("Warrior", "Aggressive");

        vm.expectEmit(true, true, true, true);
        emit AvatarInitialized(1, 1, user1, templateId);

        (uint256 avatarId, uint256 sessionId) = aura.initializeAvatar(
            templateId
        );

        assertEq(avatarId, 1);
        assertEq(sessionId, 1);
        assertEq(aura.getUserAvatarCount(user1), 1);
        assertEq(aura.getUserSessionCount(user1), 1);

        Aura.State memory state = aura.getState(user1, avatarId);
        assertEq(state.creator, user1);
        assertEq(state.avatarId, 1);
        assertEq(state.sessionId, sessionId);
        assertEq(state.templateId, templateId);
        assertEq(state.behavior, "Aggressive");
        assertTrue(state.exists);

        Aura.Memory memory mem = aura.getMemory(user1, avatarId);
        assertEq(mem.data, "");

        uint256[] memory sessions = aura.getUserSessions(user1);
        assertEq(sessions.length, 1);
        assertEq(sessions[0], 1);

        vm.stopPrank();
    }

    function test_InitializeAvatar_UserScopedCounters() public {
        // User1 creates avatars
        vm.startPrank(user1);
        uint256 template1 = aura.createTemplate("Warrior", "Aggressive");
        (uint256 avatar1User1, uint256 session1User1) = aura.initializeAvatar(
            template1
        );
        (uint256 avatar2User1, uint256 session2User1) = aura.initializeAvatar(
            template1
        );
        vm.stopPrank();

        // User2 creates avatars - should start at 1
        vm.startPrank(user2);
        uint256 template2 = aura.createTemplate("Mage", "Magical");
        (uint256 avatar1User2, uint256 session1User2) = aura.initializeAvatar(
            template2
        );
        (uint256 avatar2User2, uint256 session2User2) = aura.initializeAvatar(
            template2
        );
        vm.stopPrank();

        // User1's avatars should be 1, 2
        assertEq(avatar1User1, 1);
        assertEq(avatar2User1, 2);
        assertEq(session1User1, 1);
        assertEq(session2User1, 2);

        // User2's avatars should also be 1, 2 (scoped to user2)
        assertEq(avatar1User2, 1);
        assertEq(avatar2User2, 2);
        assertEq(session1User2, 1);
        assertEq(session2User2, 2);

        // Verify counts
        assertEq(aura.getUserAvatarCount(user1), 2);
        assertEq(aura.getUserAvatarCount(user2), 2);
        assertEq(aura.getUserSessionCount(user1), 2);
        assertEq(aura.getUserSessionCount(user2), 2);
    }

    function test_InitializeAvatar_CreatesNewSession() public {
        vm.startPrank(user1);

        uint256 templateId = aura.createTemplate("Warrior", "Aggressive");

        (uint256 avatar1, uint256 session1) = aura.initializeAvatar(templateId);
        (uint256 avatar2, uint256 session2) = aura.initializeAvatar(templateId);
        (uint256 avatar3, uint256 session3) = aura.initializeAvatar(templateId);

        assertEq(avatar1, 1);
        assertEq(avatar2, 2);
        assertEq(avatar3, 3);

        assertEq(session1, 1);
        assertEq(session2, 2);
        assertEq(session3, 3);

        uint256[] memory sessions = aura.getUserSessions(user1);
        assertEq(sessions.length, 3);

        uint256[] memory avatars = aura.getUserAvatars(user1);
        assertEq(avatars.length, 3);

        vm.stopPrank();
    }

    function test_InitializeAvatar_NonExistentTemplate_Reverts() public {
        vm.startPrank(user1);

        vm.expectRevert(Aura.TemplateNotFound.selector);
        aura.initializeAvatar(999);

        vm.stopPrank();
    }

    function test_GetAvatarBySession() public {
        vm.startPrank(user1);

        uint256 templateId = aura.createTemplate("Warrior", "Aggressive");
        (uint256 avatarId, uint256 sessionId) = aura.initializeAvatar(
            templateId
        );

        uint256 foundAvatar = aura.getAvatarBySession(user1, sessionId);
        assertEq(foundAvatar, avatarId);

        vm.stopPrank();
    }

    function test_GetAvatarBySession_UserScoped() public {
        // User1 creates avatar
        vm.prank(user1);
        uint256 template1 = aura.createTemplate("Warrior", "Aggressive");

        vm.prank(user1);
        (uint256 avatar1User1, uint256 session1User1) = aura.initializeAvatar(
            template1
        );

        // User2 creates avatar with same local session ID (1)
        vm.prank(user2);
        uint256 template2 = aura.createTemplate("Mage", "Magical");

        vm.prank(user2);
        (uint256 avatar1User2, uint256 session1User2) = aura.initializeAvatar(
            template2
        );

        // Both session IDs are 1, but scoped to different users
        assertEq(session1User1, 1);
        assertEq(session1User2, 1);

        // Lookups should return different avatars
        uint256 foundAvatar1 = aura.getAvatarBySession(user1, 1);
        uint256 foundAvatar2 = aura.getAvatarBySession(user2, 1);

        assertEq(foundAvatar1, avatar1User1);
        assertEq(foundAvatar2, avatar1User2);
    }

    function test_InitializeAvatar_MultipleSessions_IndependentAvatars()
        public
    {
        vm.startPrank(user1);

        uint256 template1 = aura.createTemplate("Warrior", "Aggressive");
        uint256 template2 = aura.createTemplate("Mage", "Magical");

        (uint256 avatar1, uint256 session1) = aura.initializeAvatar(template1);
        (uint256 avatar2, uint256 session2) = aura.initializeAvatar(template2);

        Aura.State memory state1 = aura.getState(user1, avatar1);
        Aura.State memory state2 = aura.getState(user1, avatar2);

        assertEq(state1.behavior, "Aggressive");
        assertEq(state2.behavior, "Magical");
        assertEq(state1.sessionId, session1);
        assertEq(state2.sessionId, session2);
        assertTrue(session1 != session2);

        vm.stopPrank();
    }

    // ==================== Avatar Update Tests ====================

    function test_UpdateAvatar() public {
        vm.startPrank(user1);

        uint256 templateId = aura.createTemplate("Warrior", "Aggressive");
        (uint256 avatarId, uint256 sessionId) = aura.initializeAvatar(
            templateId
        );

        vm.expectEmit(true, true, true, false);
        emit AvatarUpdated(
            avatarId,
            sessionId,
            user1,
            "attack",
            "I strike!",
            "combat_stance"
        );

        aura.updateAvatar(avatarId, "attack", "I strike!", "combat_stance");

        Aura.State memory state = aura.getState(user1, avatarId);
        assertEq(state.dialogue, "I strike!");
        assertEq(state.behavior, "combat_stance");

        Aura.Memory memory mem = aura.getMemory(user1, avatarId);
        assertTrue(bytes(mem.data).length > 0);
        assertTrue(contains(mem.data, "attack"));

        vm.stopPrank();
    }

    function test_UpdateAvatar_MultipleActions_BuildsMemory() public {
        vm.startPrank(user1);

        uint256 templateId = aura.createTemplate("Warrior", "Aggressive");
        (uint256 avatarId, ) = aura.initializeAvatar(templateId);

        aura.updateAvatar(avatarId, "attack", "I strike!", "combat");
        aura.updateAvatar(avatarId, "defend", "I block!", "defensive");
        aura.updateAvatar(avatarId, "heal", "I rest", "resting");

        Aura.Memory memory mem = aura.getMemory(user1, avatarId);
        assertTrue(contains(mem.data, "attack"));
        assertTrue(contains(mem.data, "defend"));
        assertTrue(contains(mem.data, "heal"));

        Aura.State memory state = aura.getState(user1, avatarId);
        assertEq(state.dialogue, "I rest");
        assertEq(state.behavior, "resting");

        vm.stopPrank();
    }

    function test_UpdateAvatar_NonExistent_Reverts() public {
        vm.startPrank(user1);

        vm.expectRevert(Aura.AvatarNotFound.selector);
        aura.updateAvatar(999, "action", "dialogue", "behavior");

        vm.stopPrank();
    }

    function test_UpdateAvatar_DifferentUser_Reverts() public {
        vm.prank(user1);
        uint256 templateId = aura.createTemplate("Warrior", "Aggressive");

        vm.prank(user1);
        (uint256 avatarId, ) = aura.initializeAvatar(templateId);

        // User2 tries to update user1's avatar with ID 1
        vm.prank(user2);
        vm.expectRevert(Aura.AvatarNotFound.selector);
        aura.updateAvatar(avatarId, "action", "dialogue", "behavior");
    }

    function test_UpdateAvatar_SameLocalId_DifferentUsers() public {
        // User1 creates avatar (ID 1)
        vm.startPrank(user1);
        uint256 template1 = aura.createTemplate("Warrior", "Aggressive");
        (uint256 avatar1User1, ) = aura.initializeAvatar(template1);
        aura.updateAvatar(avatar1User1, "slash", "User1 attacks", "attacking");
        vm.stopPrank();

        // User2 creates avatar (also ID 1, scoped to user2)
        vm.startPrank(user2);
        uint256 template2 = aura.createTemplate("Mage", "Magical");
        (uint256 avatar1User2, ) = aura.initializeAvatar(template2);
        aura.updateAvatar(avatar1User2, "cast", "User2 casts", "casting");
        vm.stopPrank();

        // Both have avatarId = 1, but different states
        assertEq(avatar1User1, 1);
        assertEq(avatar1User2, 1);

        Aura.State memory state1 = aura.getState(user1, 1);
        Aura.State memory state2 = aura.getState(user2, 1);

        assertEq(state1.dialogue, "User1 attacks");
        assertEq(state2.dialogue, "User2 casts");
    }

    // ==================== View Function Tests ====================

    function test_GetUserTemplates() public {
        vm.startPrank(user1);

        aura.createTemplate("Warrior", "Aggressive");
        aura.createTemplate("Mage", "Magic");
        aura.createTemplate("Rogue", "Stealthy");

        uint256[] memory templates = aura.getUserTemplates(user1);
        assertEq(templates.length, 3);
        assertEq(templates[0], 1);
        assertEq(templates[1], 2);
        assertEq(templates[2], 3);

        vm.stopPrank();
    }

    function test_GetUserAvatars() public {
        vm.startPrank(user1);

        uint256 template1 = aura.createTemplate("Warrior", "Aggressive");
        uint256 template2 = aura.createTemplate("Mage", "Magic");

        aura.initializeAvatar(template1);
        aura.initializeAvatar(template2);

        uint256[] memory avatars = aura.getUserAvatars(user1);
        assertEq(avatars.length, 2);
        assertEq(avatars[0], 1);
        assertEq(avatars[1], 2);

        vm.stopPrank();
    }

    function test_GetUserSessions() public {
        vm.startPrank(user1);

        uint256 templateId = aura.createTemplate("Warrior", "Aggressive");

        aura.initializeAvatar(templateId);
        aura.initializeAvatar(templateId);

        uint256[] memory sessions = aura.getUserSessions(user1);
        assertEq(sessions.length, 2);
        assertEq(sessions[0], 1);
        assertEq(sessions[1], 2);

        vm.stopPrank();
    }

    function test_GetUserCounts() public {
        vm.startPrank(user1);

        uint256 templateId = aura.createTemplate("Warrior", "Aggressive");

        aura.initializeAvatar(templateId);
        aura.initializeAvatar(templateId);
        aura.initializeAvatar(templateId);

        assertEq(aura.getUserAvatarCount(user1), 3);
        assertEq(aura.getUserSessionCount(user1), 3);

        vm.stopPrank();

        // User2 should have 0
        assertEq(aura.getUserAvatarCount(user2), 0);
        assertEq(aura.getUserSessionCount(user2), 0);
    }

    // ==================== Admin Tests ====================

    function test_SetPlatformTreasury() public {
        address newTreasury = makeAddr("newTreasury");

        aura.setPlatformTreasury(newTreasury);

        assertEq(aura.platformTreasury(), newTreasury);
    }

    function test_SetPlatformTreasury_ZeroAddress_Reverts() public {
        vm.expectRevert(Aura.InvalidInput.selector);
        aura.setPlatformTreasury(address(0));
    }

    function test_SetPlatformTreasury_NotOwner_Reverts() public {
        vm.prank(user1);
        vm.expectRevert(Aura.Unauthorized.selector);
        aura.setPlatformTreasury(makeAddr("newTreasury"));
    }

    // ==================== Integration Tests ====================

    function test_FullUserJourney() public {
        vm.startPrank(user1);

        // Create template
        uint256 templateId = aura.createTemplate(
            "RPG Hero",
            "Brave and curious"
        );

        // Initialize avatar (creates session automatically)
        (uint256 avatarId, uint256 sessionId) = aura.initializeAvatar(
            templateId
        );

        assertEq(avatarId, 1);
        assertEq(sessionId, 1);

        // Play through session
        aura.updateAvatar(
            avatarId,
            "explore_forest",
            "I venture into the dark woods",
            "cautious"
        );

        aura.updateAvatar(
            avatarId,
            "fight_goblin",
            "I draw my sword!",
            "combat"
        );

        aura.updateAvatar(
            avatarId,
            "loot_treasure",
            "I found gold!",
            "excited"
        );

        // Verify final state
        Aura.State memory state = aura.getState(user1, avatarId);
        assertEq(state.dialogue, "I found gold!");
        assertEq(state.behavior, "excited");

        Aura.Memory memory mem = aura.getMemory(user1, avatarId);
        assertTrue(contains(mem.data, "explore_forest"));
        assertTrue(contains(mem.data, "fight_goblin"));
        assertTrue(contains(mem.data, "loot_treasure"));

        vm.stopPrank();
    }

    function test_MultipleUsersIndependentSessions() public {
        // User1 creates template and avatar
        vm.startPrank(user1);
        uint256 template1 = aura.createTemplate("Warrior", "Aggressive");
        (uint256 avatar1, uint256 session1) = aura.initializeAvatar(template1);
        vm.stopPrank();

        // User2 creates template and avatar
        vm.startPrank(user2);
        uint256 template2 = aura.createTemplate("Mage", "Magical");
        (uint256 avatar2, uint256 session2) = aura.initializeAvatar(template2);
        vm.stopPrank();

        // Templates are global (1, 2)
        assertEq(template1, 1);
        assertEq(template2, 2);

        // But avatars and sessions are user-scoped (both 1)
        assertEq(session1, 1);
        assertEq(session2, 1);
        assertEq(avatar1, 1);
        assertEq(avatar2, 1);

        Aura.State memory state1 = aura.getState(user1, avatar1);
        Aura.State memory state2 = aura.getState(user2, avatar2);

        assertEq(state1.creator, user1);
        assertEq(state2.creator, user2);
        assertEq(state1.behavior, "Aggressive");
        assertEq(state2.behavior, "Magical");
    }

    function test_UserCanHaveMultipleActiveAvatars() public {
        vm.startPrank(user1);

        uint256 template1 = aura.createTemplate("Warrior", "Aggressive");
        uint256 template2 = aura.createTemplate("Mage", "Magical");

        (uint256 avatar1, uint256 session1) = aura.initializeAvatar(template1);
        (uint256 avatar2, uint256 session2) = aura.initializeAvatar(template2);

        // Update both avatars independently
        aura.updateAvatar(avatar1, "slash", "Take this!", "attacking");
        aura.updateAvatar(avatar2, "cast_spell", "Fireball!", "casting");

        Aura.State memory state1 = aura.getState(user1, avatar1);
        Aura.State memory state2 = aura.getState(user1, avatar2);

        assertEq(state1.dialogue, "Take this!");
        assertEq(state1.behavior, "attacking");
        assertEq(state2.dialogue, "Fireball!");
        assertEq(state2.behavior, "casting");

        // Verify sessions are tracked
        uint256[] memory sessions = aura.getUserSessions(user1);
        assertEq(sessions.length, 2);
        assertEq(sessions[0], session1);
        assertEq(sessions[1], session2);

        vm.stopPrank();
    }

    function test_IterativeLookup_UserAvatars() public {
        vm.startPrank(user1);

        uint256 template1 = aura.createTemplate("Warrior", "Aggressive");

        // Create 5 avatars
        aura.initializeAvatar(template1);
        aura.initializeAvatar(template1);
        aura.initializeAvatar(template1);
        aura.initializeAvatar(template1);
        aura.initializeAvatar(template1);

        // Can iterate through avatars 1-5 for user1
        for (uint256 i = 1; i <= 5; i++) {
            Aura.State memory state = aura.getState(user1, i);
            assertEq(state.avatarId, i);
            assertEq(state.creator, user1);
        }

        vm.stopPrank();
    }

    function test_IterativeLookup_MultipleUsers() public {
        // User1 creates 3 avatars
        vm.startPrank(user1);
        uint256 template1 = aura.createTemplate("Warrior", "Aggressive");
        aura.initializeAvatar(template1);
        aura.initializeAvatar(template1);
        aura.initializeAvatar(template1);
        vm.stopPrank();

        // User2 creates 2 avatars
        vm.startPrank(user2);
        uint256 template2 = aura.createTemplate("Mage", "Magical");
        aura.initializeAvatar(template2);
        aura.initializeAvatar(template2);
        vm.stopPrank();

        // Can iterate user1's avatars (1-3)
        for (uint256 i = 1; i <= 3; i++) {
            Aura.State memory state = aura.getState(user1, i);
            assertEq(state.avatarId, i);
            assertEq(state.creator, user1);
        }

        // Can iterate user2's avatars (1-2)
        for (uint256 i = 1; i <= 2; i++) {
            Aura.State memory state = aura.getState(user2, i);
            assertEq(state.avatarId, i);
            assertEq(state.creator, user2);
        }
    }

    // ==================== Helper Functions ====================

    function contains(
        string memory source,
        string memory search
    ) internal pure returns (bool) {
        bytes memory sourceBytes = bytes(source);
        bytes memory searchBytes = bytes(search);

        if (searchBytes.length > sourceBytes.length) return false;

        for (uint256 i = 0; i <= sourceBytes.length - searchBytes.length; i++) {
            bool found = true;
            for (uint256 j = 0; j < searchBytes.length; j++) {
                if (sourceBytes[i + j] != searchBytes[j]) {
                    found = false;
                    break;
                }
            }
            if (found) return true;
        }

        return false;
    }
}
