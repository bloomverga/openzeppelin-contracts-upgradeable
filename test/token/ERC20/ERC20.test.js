const { constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { ethers, upgrades } = require('hardhat');
const { expect } = require('chai');
const { ZERO_ADDRESS } = constants;

const {
  shouldBehaveLikeERC20,
  shouldBehaveLikeERC20Transfer,
  shouldBehaveLikeERC20Approve,
} = require('./ERC20Upgradeable.behavior');
// 1.a Here we import ethers.BigNumber, because deployProxy's
// function of OpenZeppelin upgrades use it to manipulate Big Numbers
const { BigNumber } = require('ethers');

contract('ERC20Upgradeable', function (accounts) {
  const [ initialHolder, recipient, anotherAccount ] = accounts;

  const name = 'My Token';
  const symbol = 'MTKN';

  const initialSupply = BigNumber.from('100');

  beforeEach(async function () {
    const ERC20Mock = await ethers.getContractFactory('ERC20MockUpgradeable');
    this.token = await upgrades.deployProxy(ERC20Mock, [name, symbol, initialHolder, initialSupply]);
  });

  it('has a name', async function () {
    expect(await this.token.name()).to.equal(name);
  });

  it('has a symbol', async function () {
    expect(await this.token.symbol()).to.equal(symbol);
  });

  it('has 18 decimals', async function () {
    expect(await this.token.decimals()).to.be.equal(18);
  });

  describe('_setupDecimals', function () {
    // 1.b we create our BigNumber using  ethers.BigNumber
    const decimals = BigNumber.from('6');
    it('can set decimals during construction', async function () {
      const ERC20DecimalsMock = await ethers.getContractFactory('ERC20DecimalsMockUpgradeable');

      // 1.c Here deployProxy will initialize the contract instance with no issue, since
      // 'decimals' has been created using ethers.BigNumber
      // Creating 'decimals' by `decimals = new BN('6)` generate the following issue with deployProxy :
      // Error: invalid BigNumber value (argument="value", value="6", code=INVALID_ARGUMENT, version=bignumber/5.4.1)
      const token = await upgrades.deployProxy(ERC20DecimalsMock, [name, symbol, decimals]);

      // 1.d we should convert the token.decimals() value into an ethers BigNumber
      // 1.e we should use ``...bignumber.eql`` assertion instead of ``...bignumber.equal`` in order to avoid
      // issue like `AssertionError: expected '6' to equal '6'`
      expect(BigNumber.from(await token.decimals())).to.be.bignumber.eql(decimals);
    });
  });

  shouldBehaveLikeERC20('ERC20', initialSupply, initialHolder, recipient, anotherAccount);

  describe('decrease allowance', function () {
    describe('when the spender is not the zero address', function () {
      const spender = recipient;

      function shouldDecreaseApproval (amount) {
        describe('when there was no approved amount before', function () {
          it('reverts', async function () {
            await expectRevert(this.token
              .connect(await ethers.getSigner(initialHolder))
              .decreaseAllowance(spender, amount), 'ERC20: decreased allowance below zero',
            );
          });
        });

        describe('when the spender had an approved amount', function () {
          const approvedAmount = amount;

          beforeEach(async function () {
            ({ logs: this.events } = await this.token
              .connect(await ethers.getSigner(initialHolder))
              .approve(spender, approvedAmount));
          });

          it('emits an approval event', async function () {
            // see 2.b in 'ERC20Upgradeable.behavior.js'
            const { events } = await (await this.token
              .connect(await ethers.getSigner(initialHolder))
              .decreaseAllowance(spender, approvedAmount)).wait();

            expectEvent.inLogs(events, 'Approval', {
              owner: initialHolder,
              spender: spender,
              value: BigNumber.from(0),
            });
          });

          it('decreases the spender allowance subtracting the requested amount', async function () {
            await this.token
              .connect(await ethers.getSigner(initialHolder))
              .decreaseAllowance(spender, approvedAmount.sub(1));

            expect(BigNumber.from(await this.token.allowance(initialHolder, spender)))
              .to.be.bignumber.eql(BigNumber.from('1'));
          });

          it('sets the allowance to zero when all allowance is removed', async function () {
            await this.token
              .connect(await ethers.getSigner(initialHolder))
              .decreaseAllowance(spender, approvedAmount);

            expect(BigNumber.from(await this.token.allowance(initialHolder, spender)))
              .to.be.bignumber.eql(BigNumber.from('0'));
          });

          it('reverts when more than the full allowance is removed', async function () {
            await expectRevert(
              this.token
                .connect(await ethers.getSigner(initialHolder))
                .decreaseAllowance(spender, approvedAmount.add(1)),
              'ERC20: decreased allowance below zero',
            );
          });
        });
      }

      describe('when the sender has enough balance', function () {
        const amount = initialSupply;

        shouldDecreaseApproval(amount);
      });

      describe('when the sender does not have enough balance', function () {
        const amount = initialSupply.add(1);

        shouldDecreaseApproval(amount);
      });
    });

    describe('when the spender is the zero address', function () {
      const amount = initialSupply;
      const spender = ZERO_ADDRESS;

      it('reverts', async function () {
        await expectRevert(this.token.connect(await ethers.getSigner(initialHolder))
          .decreaseAllowance(spender, amount), 'ERC20: decreased allowance below zero',
        );
      });
    });
  });

  describe('increase allowance', function () {
    const amount = initialSupply;

    describe('when the spender is not the zero address', function () {
      const spender = recipient;

      describe('when the sender has enough balance', function () {
        it('emits an approval event', async function () {
          // see 2.b in 'ERC20Upgradeable.behavior.js'
          const { events } = await (await this.token
            .connect(await ethers.getSigner(initialHolder))
            .increaseAllowance(spender, amount)).wait();

          expectEvent.inLogs(events, 'Approval', {
            owner: initialHolder,
            spender: spender,
            value: amount,
          });
        });

        describe('when there was no approved amount before', function () {
          it('approves the requested amount', async function () {
            await this.token
              .connect(await ethers.getSigner(initialHolder))
              .increaseAllowance(spender, amount);

            expect(BigNumber.from(await this.token.allowance(initialHolder, spender)))
              .to.be.bignumber.eql(amount);
          });
        });

        describe('when the spender had an approved amount', function () {
          beforeEach(async function () {
            await this.token
              .connect(await ethers.getSigner(initialHolder))
              .approve(spender, BigNumber.from(1));
          });

          it('increases the spender allowance adding the requested amount', async function () {
            await this.token
              .connect(await ethers.getSigner(initialHolder))
              .increaseAllowance(spender, amount);

            expect(BigNumber.from(await this.token.allowance(initialHolder, spender)))
              .to.be.bignumber.eql(amount.add(1));
          });
        });
      });

      describe('when the sender does not have enough balance', function () {
        const amount = initialSupply.add(1);

        it('emits an approval event', async function () {
          const { events } = await (await this.token
            .connect(await ethers.getSigner(initialHolder))
            .increaseAllowance(spender, amount)).wait();

          expectEvent.inLogs(events, 'Approval', {
            owner: initialHolder,
            spender: spender,
            value: amount,
          });
        });

        describe('when there was no approved amount before', function () {
          it('approves the requested amount', async function () {
            await this.token
              .connect(await ethers.getSigner(initialHolder))
              .increaseAllowance(spender, amount);

            expect(BigNumber.from(await this.token.allowance(initialHolder, spender)))
              .to.be.bignumber.eql(amount);
          });
        });

        describe('when the spender had an approved amount', function () {
          beforeEach(async function () {
            await this.token
              .connect(await ethers.getSigner(initialHolder))
              .approve(spender, BigNumber.from(1));
          });

          it('increases the spender allowance adding the requested amount', async function () {
            await this.token
              .connect(await ethers.getSigner(initialHolder))
              .increaseAllowance(spender, amount);

            expect(BigNumber.from(await this.token.allowance(initialHolder, spender)))
              .to.be.bignumber.eql(amount.add(1));
          });
        });
      });
    });

    describe('when the spender is the zero address', function () {
      const spender = ZERO_ADDRESS;

      it('reverts', async function () {
        await expectRevert(
          this.token
            .connect(await ethers.getSigner(initialHolder))
            .increaseAllowance(spender, amount), 'ERC20: approve to the zero address',
        );
      });
    });
  });

  describe('_mint', function () {
    const amount = BigNumber.from(50);
    it('rejects a null account', async function () {
      await expectRevert(
        this.token.mint(ZERO_ADDRESS, amount), 'ERC20: mint to the zero address',
      );
    });

    describe('for a non zero account', function () {
      beforeEach('minting', async function () {
        const { events } = await (await this.token.mint(recipient, amount)).wait();
        this.logs = events;
      });

      it('increments totalSupply', async function () {
        const expectedSupply = initialSupply.add(amount);
        expect(BigNumber.from(await this.token.totalSupply()))
          .to.be.bignumber.eql(expectedSupply);
      });

      it('increments recipient balance', async function () {
        expect(BigNumber.from(await this.token.balanceOf(recipient)))
          .to.be.bignumber.eql(amount);
      });

      it('emits Transfer event', async function () {
        const event = expectEvent.inLogs(this.logs, 'Transfer', {
          from: ZERO_ADDRESS,
          to: recipient,
        });

        expect(BigNumber.from(event.args.value)).to.be.bignumber.eql(amount);
      });
    });
  });

  describe('_burn', function () {
    it('rejects a null account', async function () {
      await expectRevert(this.token.burn(ZERO_ADDRESS, BigNumber.from(1)),
        'ERC20: burn from the zero address');
    });

    describe('for a non zero account', function () {
      it('rejects burning more than balance', async function () {
        await expectRevert(this.token.burn(
          initialHolder, initialSupply.add(1)), 'ERC20: burn amount exceeds balance',
        );
      });

      const describeBurn = function (description, amount) {
        describe(description, function () {
          beforeEach('burning', async function () {
            const { events } = await (await this.token.burn(initialHolder, amount)).wait();
            this.logs = events;
          });

          it('decrements totalSupply', async function () {
            const expectedSupply = initialSupply.sub(amount);
            expect(BigNumber.from(await this.token.totalSupply()))
              .to.be.bignumber.eql(expectedSupply);
          });

          it('decrements initialHolder balance', async function () {
            const expectedBalance = initialSupply.sub(amount);
            expect(BigNumber.from(await this.token.balanceOf(initialHolder)))
              .to.be.bignumber.eql(expectedBalance);
          });

          it('emits Transfer event', async function () {
            const event = expectEvent.inLogs(this.logs, 'Transfer', {
              from: initialHolder,
              to: ZERO_ADDRESS,
            });

            expect(BigNumber.from(event.args.value)).to.be.bignumber.eql(amount);
          });
        });
      };

      describeBurn('for entire balance', initialSupply);
      describeBurn('for less amount than balance', initialSupply.sub(1));
    });
  });

  describe('_transfer', function () {
    shouldBehaveLikeERC20Transfer('ERC20', initialHolder, recipient, initialSupply, function (from, to, amount) {
      return this.token.transferInternal(from, to, amount);
    });

    describe('when the sender is the zero address', function () {
      it('reverts', async function () {
        await expectRevert(this.token.transferInternal(ZERO_ADDRESS, recipient, initialSupply),
          'ERC20: transfer from the zero address',
        );
      });
    });
  });

  describe('_approve', function () {
    shouldBehaveLikeERC20Approve('ERC20', initialHolder, recipient, initialSupply, function (owner, spender, amount) {
      return this.token.approveInternal(owner, spender, amount);
    });

    describe('when the owner is the zero address', function () {
      it('reverts', async function () {
        await expectRevert(this.token.approveInternal(ZERO_ADDRESS, recipient, initialSupply),
          'ERC20: approve from the zero address',
        );
      });
    });
  });
});
