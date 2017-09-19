var Remittance = artifacts.require("./Remittance.sol");
var Promise = require("bluebird");
var _ = require("underscore");

Promise.promisifyAll(web3.eth);

function rightPaddingForHex(str, padding) {
  for (var i = str.length - 2; i < padding; i++) {
    str += "0";
  }
  return str;
}

contract('Remittance', accounts => {

  var owner = accounts[0];
  var alice = accounts[1];
  var carol = accounts[2];
  var contract;

  var password = "testPassword";
  var challengeHash = web3.sha3(rightPaddingForHex(web3.fromAscii(password), 64) + carol.substring(2), { encoding: "hex" });

  beforeEach(() => {
    return Remittance.new({ from: owner }).then(instance => contract = instance);
  });

  it ("should deploy properly", () => {
    return web3.eth.getBalanceAsync(contract.address)
    .then(contractBalance => {
      assert.equal(contractBalance.toString(10), "0", "Initial contract balance should be zero");
    });
  });

  it ("should register the challenge", () => {
    var originalContractBalance;
    var blockNumber;

    return web3.eth.getBalanceAsync(contract.address)
    .then(contractBalance => {
      originalContractBalance = contractBalance;

      return contract.registerChallenge(challengeHash, 200, { from: alice, value: web3.toWei(1, "ether") });
    }).then((tx) => {
      blockNumber = web3.eth.blockNumber;
      assert.isTrue(!_.isUndefined(tx.receipt), "Registration transaction should have a receipt");
      
      var onChallengeRegisteredEvent = _(tx.logs).findWhere({ event: "OnChallengeRegistered" });
      assert.isTrue(!_.isUndefined(onChallengeRegisteredEvent), "OnChallengeRegistered event should fire");

      return Promise.all([
        web3.eth.getBalanceAsync(contract.address), 
        contract.challenges(challengeHash)
      ]);
    }).then(results => {
      var contractBalance = results[0];
      var amount = results[1][0];
      var deadline = results[1][1];
      var challengeOwner = results[1][2];

      assert.equal(contractBalance.toString(10), originalContractBalance.plus(web3.toWei(1, "ether")).toString(10), "Contract balance should have increased");
      assert.equal(amount.toString(10), web3.toWei(1, "ether").toString(10), "Amount should properly register");
      assert.equal(deadline.toString(10), (blockNumber + 200).toString(10), "Deadline should properly register");
      assert.equal(challengeOwner, alice, "Alice should properly register as the challenge owner");
    });
  });

  it ("should successfuly solve the challenge when password is correct", () => {
    var currentContractAccountBalance;

    return contract.accounts(carol)
    .then(balance => {
      currentContractAccountBalance = balance;
      return contract.registerChallenge(challengeHash, 200, { from: alice, value: web3.toWei(1, "ether") });
    }).then(tx => {
      return contract.solveChallenge(password, { from: carol });
    }).then(tx => {
      assert.isTrue(!_.isUndefined(tx.receipt), "Solver transaction should have a receipt");
      
      var onChallengeSolvedEvent = _(tx.logs).findWhere({ event: "OnChallengeSolved" });
      assert.isTrue(!_.isUndefined(onChallengeSolvedEvent), "OnChallengeSolved event should fire");

      return Promise.all([
        contract.accounts(carol),
        contract.challenges(challengeHash)
      ]);
    }).then(results => {
      var carolsAccountBalance = results[0];
      var amount = results[1][0];

      assert.equal(carolsAccountBalance.toString(10), currentContractAccountBalance.plus(web3.toWei(1, "ether").toString(10)), "Carol's contract balance should have increased");
      assert.equal(amount.toString(10), "0", "Challenge amount should be zero");
    });
  });
  it ("should reject solving on wrong password", () => {
    var wrongPassword = "wrong";

    return contract.registerChallenge(challengeHash, 200, { from: alice, value: web3.toWei(1, "ether") })
    .then(tx => {
      return contract.solveChallenge(wrongPassword, { from: carol });
    }).then(assert.fail, _.noop);
  });
  it ("should reject solving on wrong account", () => {
    return contract.registerChallenge(challengeHash, 200, { from: alice, value: web3.toWei(1, "ether") })
    .then(tx => {
      return contract.solveChallenge(password, { from: alice });
    }).then(assert.fail, _.noop);
  });
  it ("should reject solving on deadline passed", () => {
    return contract.registerChallenge(challengeHash, 1, { from: alice, value: web3.toWei(1, "ether") })
    .then(tx => {
      return contract.registerChallenge("test", 100, { from: alice, value: web3.toWei(1, "ether") })
    }).then(balance => {
      return contract.solveChallenge(password, { from: carol });
    }).then(assert.fail, _.noop);
  });

  it ("should allow refund after deadline passed", () => {
    var originalAliceContractBalance;

    return contract.accounts(alice)
    .then(balance => {
      originalAliceContractBalance = balance;
      return contract.registerChallenge(challengeHash, 1, { from: alice, value: web3.toWei(1, "ether") });
    }).then(tx => {
      return contract.registerChallenge("test", 100, { from: alice, value: web3.toWei(1, "ether") })
    }).then(tx => {
      return contract.requestRefund(challengeHash, { from: alice });
    }).then(tx => {
      assert.isTrue(!_.isUndefined(tx.receipt), "Refund transaction should have a receipt");
      
      var onRefundEvent = _(tx.logs).findWhere({ event: "OnRefund" });
      assert.isTrue(!_.isUndefined(onRefundEvent), "OnRefund event should fire");

      return contract.accounts(alice)
    }).then(balance => {
      assert.equal(balance.toString(10), originalAliceContractBalance.plus(web3.toWei(1, "ether")).toString(10), "Alice's balance should increase")
    });
  });
  it ("should not allow refund before deadline passed", () => {
    return contract.registerChallenge(challengeHash, 100, { from: alice, value: web3.toWei(1, "ether") })
    .then(tx => {
      return contract.requestRefund(challengeHash, { from: alice });
    }).then(assert.fail, _.noop);
  });

  it ("should allow withdrawal on positive balance", () => {
    var originalCarolsBalance;

    return web3.eth.getBalanceAsync(carol)
    .then(balance => {
      originalCarolsBalance = balance;
      return contract.registerChallenge(challengeHash, 200, { from: alice, value: web3.toWei(1, "ether") })
    }).then(tx => {
      return contract.solveChallenge(password, { from: carol });
    }).then(tx => {
      return contract.withdraw({ from: carol });
    }).then(tx => {
      assert.isTrue(!_.isUndefined(tx.receipt), "Withdrawal transaction should have a receipt");
      
      var onWithdrawalEvent = _(tx.logs).findWhere({ event: "OnWithdrawal" });
      assert.isTrue(!_.isUndefined(onWithdrawalEvent), "OnWithdrawal event should fire");

      return web3.eth.getBalanceAsync(carol);
    }).then(balance => {
      assert.isTrue(balance.greaterThan(originalCarolsBalance), "Carol's balance should have increased")
    });
  });
  it ("should reject withdrawal on 0 balance", () => {
    return contract.accounts(carol)
    .then(balance => {
      assert.equal(balance.toString(10), "0", "Carol's contract balance should be zero");

      return contract.withdraw({ from: carol });
    }).then(assert.fail, _.noop);
  });

  it ("should properly suicide and send funds to owner", () => {
    var originalOwnerBalance;

    return web3.eth.getBalanceAsync(owner)
    .then(balance => {
      originalOwnerBalance = balance;
      return contract.registerChallenge(challengeHash, 200, { from: alice, value: web3.toWei(1, "ether") })
    }).then(tx => {
      return contract.killMe({ from: owner });
    }).then(() => {
      var ownerBalancePromise = web3.eth.getBalanceAsync(owner);
      var contractBalancePromise = web3.eth.getBalanceAsync(contract.address);

      return Promise.all([ownerBalancePromise, contractBalancePromise]);
    }).then(results => {
      var ownerBalance = results[0];
      var contractBalance = results[1];

      assert.equal(contractBalance.toString(10), "0", "Contract balance should be zero");
      assert.isTrue(ownerBalance.greaterThan(originalOwnerBalance), "Owner should recieve contract balance after contract is destroyed");
    })
  });
  it ("should not allow non-owner to suicide", () => {
    return contract.registerChallenge(challengeHash, 200, { from: alice, value: web3.toWei(1, "ether") })
    .then(tx => {
      return contract.killMe({ from: alice });
    }).then(() => {
      return web3.eth.getBalanceAsync(contract.address);
    }).then(balance => {
      assert.equal(balance.toString(10), web3.toWei(1, "ether").toString(10), "Contract balance should be intact");
    });
  });
});
