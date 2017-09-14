var RemittanceMyself = artifacts.require("./RemittanceMyself.sol");

contract('RemittanceMyself', function (accounts) {

  var owner = accounts[0];
  var alice = accounts[1];
  var carol = accounts[3];
  var deadline = 10;
  var contract;
  var blockNumber;

  beforeEach(() => {
    return RemittanceMyself.new(carol, alice, deadline, { from: owner }).then(instance => {
    	blockNumber = web3.eth.blockNumber;
    	contract = instance;
    });
  });

  it ("should deploy properly", () => {
    return contract.carol().then((c) => {
      assert.equal(c, carol, "Carol's address does not match");
      return contract.deadline();
    }).then((d) => {
      assert.equal(d.toString(10), (deadline + blockNumber).toString(10), "Deadline does not match");
      return contract.alice();
    }).then((a) => {
      assert.equal(a, alice, "Alice's address does not match");
      return web3.eth.getBalance(contract.address);
    }).then((contractBalance) => {
      assert.equal(contractBalance.toString(10), "0");
    });
  });

  it ("should contribute", () => {
    return contract.sendTransaction({ from: owner, value: web3.toWei(1, "ether") }).then(() => {
      return web3.eth.getBalance(contract.address);
    }).then((contractBalance) => {
      assert.equal(contractBalance.toString(10), web3.toWei(1, "ether"));
    }).then(() => {
      return contract.sendTransaction({ from: alice, value: web3.toWei(1, "ether") })
    }).then(() => {
      return web3.eth.getBalance(contract.address);
    }).then((contractBalance) => {
      assert.equal(contractBalance.toString(10), web3.toWei(2, "ether"));
    });
  });
});
