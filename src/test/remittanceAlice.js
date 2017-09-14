var RemittanceAlice = artifacts.require("./RemittanceAlice.sol");

contract('RemittanceAlice', function (accounts) {

  var owner = accounts[0];
  var carol = accounts[3];
  var deadline = 10;
  var comissionPercentage = 10;
  var contract;
  var blockNumber;

  beforeEach(() => {
    return RemittanceAlice.new(carol, deadline, comissionPercentage, { from: owner }).then(instance => {
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
      return contract.comissionPercentage();
    }).then((p) => {
      assert.equal(p.toString(10), comissionPercentage.toString(10), "Commisison does not match");
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
      return contract.sendTransaction({ from: carol, value: web3.toWei(1, "ether") })
    }).then(() => {
      return web3.eth.getBalance(contract.address);
    }).then((contractBalance) => {
      assert.equal(contractBalance.toString(10), web3.toWei(2, "ether"));
    });
  });

  it ("should reject if deadline not passed", () => {
    var ownerBalance = web3.eth.getBalance(owner);

    return contract.sendTransaction({ from: carol, value: web3.toWei(10, "ether") }).then(() => {
      return contract.killMe.sendTransaction({ from: owner });
    }).catch(() => {
      return contract.deadline();
    }).then((d) => {
      assert.isTrue(d.greaterThan(web3.eth.blockNumber));
    });
  });

  it ("should properly suicide and send funds to owner (Alice) if deadline passed", () => {
    var ownerBalance = web3.eth.getBalance(owner);
    
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
      return contract.killMe.sendTransaction({ from: owner });
    }).then(() => {
      var newOwnerBalance = web3.eth.getBalance(owner);
      var newContractBalance = web3.eth.getBalance(contract.address);

      assert.equal(newContractBalance.toString(10), "0");
      assert.isTrue(newOwnerBalance.greaterThan(ownerBalance));
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
      ownersShare = contractBalance.minus(contractBalance.times(comissionPercentage / 100));
      carolsShare = contractBalance.minus(ownersShare);

      return contract.releaseFunds.sendTransaction(password1, password2, { from: accounts[1] });
    }).then(() => {
      assert.equal(web3.eth.getBalance(contract.address).toString(10), "0");
      assert.equal(web3.eth.getBalance(owner).toString(10), ownerBalance.plus(ownersShare).toString(10));
      assert.equal(web3.eth.getBalance(carol).toString(10), carolBalance.plus(carolsShare).toString(10));
    });
  });
});
