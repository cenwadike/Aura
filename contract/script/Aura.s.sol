// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {Aura} from "../src/Aura.sol";

contract AuraScript is Script {
    Aura public aura;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        // Provide the platform treasury address via environment variable
        address platformTreasury = vm.envAddress("PLATFORM_TREASURY");

        // Deploy Aura with the required constructor argument
        aura = new Aura(platformTreasury);

        vm.stopBroadcast();
    }
}
