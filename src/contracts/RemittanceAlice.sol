pragma solidity ^0.4.5;

contract RemittanceAlice {
    address owner;
    address public carol;
    uint public deadline;
    uint public comissionPercentage;
    
    bytes32 withdrawalPassword = 0xa9d312bbc2166851cfd97fc8329bef23c9ffef07922cf838ae47e73b9b59b4a5;
    
    event OnContribution(address indexed contributor, uint value);
    event FundsReleased(address carol, uint value);
    event FundsReturnedToAlice(address alice, uint value);

    function RemittanceAlice(address _carol, uint _deadline, uint _comissionPercentage) payable {
        require(_carol != address(0));
        // some constraints on the deadline
        require(_deadline > 5 && _deadline < 100);
        
        // since this is Alice's contract we will consider her the "owner"
        owner = msg.sender;
        carol = _carol;
        deadline = block.number + _deadline;
        comissionPercentage = _comissionPercentage;
    }

    // since Alice is the contract owner and she can claim back the ether only after the deadline has passed
    // the kill switch doubles as the withdraw funds function for alice 
    // (the reasoning being if the deadline is passed the contract is not neccessary anymore and might as well kill it while withdrawing the funds to Alice ("owner"))
    function killMe() {
        require(msg.sender == owner);
        require(hasDeadlinePassed());
        
        FundsReturnedToAlice(owner, this.balance);

        suicide(owner);
    }
    
    function hasDeadlinePassed() private returns (bool) {
        return block.number > deadline;
    }

    function releaseFunds(bytes32 p1, bytes32 p2) returns (uint) {
        require(this.balance > 0);
        require(keccak256(p1, p2) == withdrawalPassword);
        
        // handle comission
        if (!owner.send(this.balance - (this.balance * comissionPercentage / 100))) revert();

        var balance = this.balance;
        // send the remaining balance
        if (!carol.send(this.balance)) revert();

        FundsReleased(carol, balance);

        // after the password have been used they are "burned" (visible in the transaction) so we kill the contract
        suicide(owner);
    }

    function () payable {
        OnContribution(msg.sender, msg.value);
    }
}
