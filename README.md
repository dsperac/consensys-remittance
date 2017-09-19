# Remittance Cotnract

A smart contract enabling a specific third party account to withdraw funds after a correct password has been supplied.

* The contract keeps an internal list of balances and challenges
* The challenge hash is computed from the combination of a password and the address of the target account which will be able to withdraw funds
* After supplying the correct password before the deadline expires the third party account can withdraw funds
* Provides the means for the original challenge supplier to request a refund in case the deadline expires
* Also includes a selfdestruct function for the contract owner