// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "../../governance/GovernorUpgradeable.sol";
import "../../governance/compatibility/GovernorCompatibilityBravoUpgradeable.sol";
import "../../governance/extensions/GovernorVotesUpgradeable.sol";
import "../../governance/extensions/GovernorVotesQuorumFractionUpgradeable.sol";
import "../../governance/extensions/GovernorTimelockControlUpgradeable.sol";
import "../../proxy/utils/Initializable.sol";

contract MyGovernorUpgradeable is
    Initializable, GovernorUpgradeable,
    GovernorTimelockControlUpgradeable,
    GovernorCompatibilityBravoUpgradeable,
    GovernorVotesUpgradeable,
    GovernorVotesQuorumFractionUpgradeable
{
    function __MyGovernor_init(ERC20VotesUpgradeable _token, TimelockControllerUpgradeable _timelock) internal initializer {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __EIP712_init_unchained(name_, version());
        __IGovernor_init_unchained();
        __IGovernorTimelock_init_unchained();
        __IGovernorCompatibilityBravo_init_unchained();
        __Governor_init_unchained("MyGovernor");
        __GovernorTimelockControl_init_unchained(_timelock);
        __GovernorCompatibilityBravo_init_unchained();
        __GovernorVotes_init_unchained(_token);
        __GovernorVotesQuorumFraction_init_unchained(4);
        __MyGovernor_init_unchained(_token, _timelock);
    }

    function __MyGovernor_init_unchained(ERC20VotesUpgradeable _token, TimelockControllerUpgradeable _timelock) internal initializer {}

    function votingDelay() public pure override returns (uint256) {
        return 1; // 1 block
    }

    function votingPeriod() public pure override returns (uint256) {
        return 45818; // 1 week
    }

    function proposalThreshold() public pure override returns (uint256) {
        return 1000e18;
    }

    // The following functions are overrides required by Solidity.

    function quorum(uint256 blockNumber)
        public
        view
        override(IGovernorUpgradeable, GovernorVotesQuorumFractionUpgradeable)
        returns (uint256)
    {
        return super.quorum(blockNumber);
    }

    function getVotes(address account, uint256 blockNumber)
        public
        view
        override(IGovernorUpgradeable, GovernorVotesUpgradeable)
        returns (uint256)
    {
        return super.getVotes(account, blockNumber);
    }

    function state(uint256 proposalId)
        public
        view
        override(GovernorUpgradeable, IGovernorUpgradeable, GovernorTimelockControlUpgradeable)
        returns (ProposalState)
    {
        return super.state(proposalId);
    }

    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) public override(GovernorUpgradeable, GovernorCompatibilityBravoUpgradeable, IGovernorUpgradeable) returns (uint256) {
        return super.propose(targets, values, calldatas, description);
    }

    function _execute(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(GovernorUpgradeable, GovernorTimelockControlUpgradeable) {
        super._execute(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(GovernorUpgradeable, GovernorTimelockControlUpgradeable) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function _executor() internal view override(GovernorUpgradeable, GovernorTimelockControlUpgradeable) returns (address) {
        return super._executor();
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(GovernorUpgradeable, IERC165Upgradeable, GovernorTimelockControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
    uint256[50] private __gap;
}
