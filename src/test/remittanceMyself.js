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

  it ("should reject alice withdrawal if deadline not passed", () => {
    var ownerBalance = web3.eth.getBalance(owner);

    return contract.sendTransaction({ from: carol, value: web3.toWei(10, "ether") }).then(() => {
      return contract.returnFundsToAlice.sendTransaction({ from: alice });
    }).catch(() => {
      return contract.deadline();
    }).then((d) => {
      assert.isTrue(d.greaterThan(web3.eth.blockNumber));
    });
  });

  it ("should send funds to Alice if deadline passed", () => {
    var aliceBalance = web3.eth.getBalance(alice);
    
    return contract.sendTransaction({ from: carol, value: web3.toWei(1, "ether") }).then(() => {
      return contract.sendTransaction({ from: carol, value: web3.toWei(1, "ether") });
    }).then(() => {
      return contract.sendTransaction({ from: carol, value: web3.toWei(1, "ether") });
    }).then(() => {
      return contract.sendTransaction({ from: carol, value: web3.toWei(1, "ether") });
    }).then(() => {
      return contract.sendTransaction({ from: carol, value: web3.toWei(1, "ether") });
    }).then(() => {
      return contract.sendTransaction({ from: carol, value: web3.toWei(1, "ether") });
    }).then(() => {
      return contract.sendTransaction({ from: carol, value: web3.toWei(1, "ether") });
    }).then(() => {
      return contract.sendTransaction({ from: carol, value: web3.toWei(1, "ether") });
    }).then(() => {
      return contract.sendTransaction({ from: carol, value: web3.toWei(1, "ether") });
    }).then(() => {
      return contract.sendTransaction({ from: carol, value: web3.toWei(1, "ether") });
    }).then(() => {
      return contract.returnFundsToAlice.sendTransaction({ from: alice });
    }).then(() => {
      var newAliceBalance = web3.eth.getBalance(alice);
      var newContractBalance = web3.eth.getBalance(contract.address);

      assert.equal(newContractBalance.toString(10), "0");
      assert.isTrue(newAliceBalance.greaterThan(aliceBalance));
    });
  });

  it ("should reject pulling of funds for wrong passwords", () => {
    var contractBalance;

    return contract.sendTransaction({ from: carol, value: web3.toWei(1, "ether") }).then(() => {
      contractBalance = web3.eth.getBalance(contract.address);
      return contract.releaseFunds.sendTransaction("wrong1", "wrong2", { from: accounts[1] });
    }).catch(() => {
      assert.equal(contractBalance.toString(10), web3.eth.getBalance(contract.address).toString(10));
    });
  });

  it ("should properly divide and send funds for proper passwords", () => {
    var password1 = "0x67a24fc590102263470c68f1be8166f51584c4b3a225eeb68316cb11233efbae";
    var password2 = "0x542dfde5084bc933f8c39206e03113d363052a86d2f31fd905e6e6e9ed82a4ba";
    var ownerBalance = web3.eth.getBalance(owner);
    var carolBalance = web3.eth.getBalance(carol);
    var ownersShare;
    var carolsShare;

    return contract.sendTransaction({ from: accounts[1], value: web3.toWei(10, "ether") }).then(() => {
      var contractBalance = web3.eth.getBalance(contract.address);
      ownersShare = contractBalance.minus(contractBalance.minus(web3.toWei(0.01, "ether")));
      carolsShare = contractBalance.minus(ownersShare);

      return contract.releaseFunds.sendTransaction(password1, password2, { from: accounts[1] });
    }).then(() => {
      assert.equal(web3.eth.getBalance(contract.address).toString(10), "0");
      assert.equal(web3.eth.getBalance(owner).toString(10), ownerBalance.plus(ownersShare).toString(10));
      assert.equal(web3.eth.getBalance(carol).toString(10), carolBalance.plus(carolsShare).toString(10));
    });
  });

  it ("should properly suicide and send funds to owner", () => {
    var ownerBalance = web3.eth.getBalance(owner);

    return contract.sendTransaction({ from: carol, value: web3.toWei(10, "ether") }).then(() => {
      return contract.killMe.sendTransaction({ from: owner });
    }).then(() => {
      var newOwnerBalance = web3.eth.getBalance(owner);
      var newContractBalance = web3.eth.getBalance(contract.address);

      assert.equal(newContractBalance.toString(10), "0");
      assert.isTrue(newOwnerBalance.greaterThan(ownerBalance));
    });
  });
});
