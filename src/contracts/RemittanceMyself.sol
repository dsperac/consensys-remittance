pragma solidity ^0.4.5;

contract RemittanceMyself {
    address owner;
    address public alice;
    address public carol;
    uint public deadline;
    // this is less then the current gas price * the deployment and execution cost of the contract
    uint public comission = 0.01 ether;
    
    bytes32 withdrawalPassword = 0xa9d312bbc2166851cfd97fc8329bef23c9ffef07922cf838ae47e73b9b59b4a5;
    
    function RemittanceMyself(address _carol, address _alice, uint _deadline) payable {
        require(_carol != address(0));
        require(_alice != address(0));
        // some constraints on the deadline
        require(_deadline > 5 && _deadline < 100);
        
        owner = msg.sender;
        alice = _alice;
        carol = _carol;
        deadline = block.number + _deadline;
    }

    function killMe() {
        require(msg.sender == owner);
        
        suicide(owner);
    }
    
    function hasDeadlinePassed() private returns (bool) {
        return block.number > deadline;
    }

    function releaseFunds(bytes32 p1, bytes32 p2) returns (uint) {
        require(this.balance > comission);
        require(keccak256(p1, p2) == withdrawalPassword);
        
        // handle comission
        if (!owner.send(comission)) revert();
        // send the remaining balance
        if (!carol.send(this.balance)) revert();

        // after the password have been used they are "burned" (visible in the transaction) so we kill the contract
        suicide(owner);
    }
    function returnFundsToAlice() {
        require(this.balance > 0);
        require(msg.sender == alice);
        require(hasDeadlinePassed());
        
        if (!alice.send(this.balance)) revert();
    }

    function () payable {
    }
}
