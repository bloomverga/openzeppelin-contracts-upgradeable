const { constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { ZERO_ADDRESS } = constants;
// see 1.a in 'ERC20.test.js'
const { BigNumber } = require('ethers');
function shouldBehaveLikeERC20 (errorPrefix, initialSupply, initialHolder, recipient, anotherAccount) {
  describe('total supply', function () {
    it('returns the total amount of tokens', async function () {
      // see 1.d and 1.e in 'ERC20.test.js'
      expect(BigNumber.from(await this.token.totalSupply())).to.be.bignumber.eql(initialSupply);
    });
  });

  describe('balanceOf', function () {
    describe('when the requested account has no tokens', function () {
      it('returns zero', async function () {
        expect(BigNumber.from(await this.token.balanceOf(anotherAccount)))
          .to.be.bignumber.eql(BigNumber.from('0'));
      });
    });

    describe('when the requested account has some tokens', function () {
      it('returns the total amount of tokens', async function () {
        expect(BigNumber.from(await this.token.balanceOf(initialHolder)))
          .to.be.bignumber.eql(BigNumber.from(initialSupply));
      });
    });
  });

  describe('transfer', function () {
    shouldBehaveLikeERC20Transfer(errorPrefix, initialHolder, recipient, initialSupply,
      async function (from, to, value) {
        return this.token
          .connect(await ethers.getSigner(from))
          .transfer(to, value);
      },
    );
  });

  describe('transfer from', function () {
    const spender = recipient;

    describe('when the token owner is not the zero address', function () {
      const tokenOwner = initialHolder;

      describe('when the recipient is not the zero address', function () {
        const to = anotherAccount;

        describe('when the spender has enough approved balance', function () {
          beforeEach(async function () {
            // 2.a The previous statement `await this.token.transferFrom(tokenOwner, to, amount, { from: spender });`
            // generated the following error
            // 'Error: Contract with a Signer cannot override from'
            await this.token
              .connect(await ethers.getSigner(initialHolder))
              .approve(spender, initialSupply);
          });

          describe('when the token owner has enough balance', function () {
            const amount = initialSupply;

            it('transfers the requested amount', async function () {
              // see 2.a
              await this.token
                .connect(await ethers.getSigner(spender))
                .transferFrom(tokenOwner, to, amount);

              expect(BigNumber.from(await this.token.balanceOf(tokenOwner)))
                .to.be.bignumber.eql(BigNumber.from('0'));

              expect(BigNumber.from(await this.token.balanceOf(to)))
                .to.be.bignumber.eql(BigNumber.from(amount));
            });

            it('decreases the spender allowance', async function () {
              await this.token
                .connect(await ethers.getSigner(spender))
                .transferFrom(tokenOwner, to, amount);

              expect(BigNumber.from(await this.token.allowance(tokenOwner, spender)))
                .to.be.bignumber.eql(BigNumber.from('0'));
            });

            it('emits a transfer event', async function () {
              // 2.b ethers.js, by default, uses polling to get events, and the polling interval is 4 seconds
              // If we want to get the results from an event, we must wait the transaction to end
              // The verbose way of writing the line below is :
              //    const tx = await this.token
              //        .connect(await ethers.getSigner(spender))
              //        .transferFrom(tokenOwner, to, amount)
              //    const txReceipt = await tx.wait();
              //    const events = txReceipt.events
              // for more details, see https://stackoverflow.com/a/69025256
              const { events } = await (await this.token
                .connect(await ethers.getSigner(spender))
                .transferFrom(tokenOwner, to, amount)).wait();

              // TODO : expectEvent.inLogs() is deprecated, we should use expectEvent() instead,
              expectEvent.inLogs(events, 'Transfer', {
                from: tokenOwner,
                to: to,
                value: amount,
              });
            });

            it('emits an approval event', async function () {
              const { events } = await (await this.token
                .connect(await ethers.getSigner(spender))
                .transferFrom(tokenOwner, to, amount)).wait();

              expectEvent.inLogs(events, 'Approval', {
                owner: tokenOwner,
                spender: spender,
                value: await this.token.allowance(tokenOwner, spender),
              });
            });
          });

          describe('when the token owner does not have enough balance', function () {
            const amount = initialSupply.add(1);

            it('reverts', async function () {
              await expectRevert(
                this.token
                  .connect(await ethers.getSigner(spender))
                  .transferFrom(tokenOwner, to, amount), `${errorPrefix}: transfer amount exceeds balance`,
              );
            });
          });
        });

        describe('when the spender does not have enough approved balance', function () {
          beforeEach(async function () {
            await this.token
              .connect(await ethers.getSigner(tokenOwner))
              .approve(spender, initialSupply.sub(1));
          });

          describe('when the token owner has enough balance', function () {
            const amount = initialSupply;

            it('reverts', async function () {
              await expectRevert(
                this.token
                  .connect(await ethers.getSigner(spender))
                  .transferFrom(tokenOwner, to, amount)
                , `${errorPrefix}: transfer amount exceeds allowance`,
              );
            });
          });

          describe('when the token owner does not have enough balance', function () {
            const amount = initialSupply.add(1);

            it('reverts', async function () {
              await expectRevert(this.token
                .connect(await ethers.getSigner(spender))
                .transferFrom(tokenOwner, to, amount)
              , `${errorPrefix}: transfer amount exceeds balance`,
              );
            });
          });
        });
      });

      describe('when the recipient is the zero address', function () {
        const amount = initialSupply;
        const to = ZERO_ADDRESS;

        beforeEach(async function () {
          await this.token
            .connect(await ethers.getSigner(tokenOwner))
            .approve(spender, amount);
        });

        it('reverts', async function () {
          await expectRevert(this.token
            .connect(await ethers.getSigner(spender))
            .transferFrom(tokenOwner, to, amount)
          , `${errorPrefix}: transfer to the zero address`,
          );
        });
      });
    });

    describe('when the token owner is the zero address', function () {
      const amount = 0;
      const tokenOwner = ZERO_ADDRESS;
      const to = recipient;

      it('reverts', async function () {
        await expectRevert(this.token
          .connect(await ethers.getSigner(spender))
          .transferFrom(tokenOwner, to, amount)
        , `${errorPrefix}: transfer from the zero address`,
        );
      });
    });
  });

  describe('approve', function () {
    shouldBehaveLikeERC20Approve(errorPrefix, initialHolder, recipient, initialSupply,
      async function (owner, spender, amount) {
        return this.token
          .connect(await ethers.getSigner(owner))
          .approve(spender, amount);
      },
    );
  });
}

function shouldBehaveLikeERC20Transfer (errorPrefix, from, to, balance, transfer) {
  describe('when the recipient is not the zero address', function () {
    describe('when the sender does not have enough balance', function () {
      const amount = balance.add(1);

      it('reverts', async function () {
        await expectRevert(transfer.call(this, from, to, amount),
          `${errorPrefix}: transfer amount exceeds balance`,
        );
      });
    });

    describe('when the sender transfers all balance', function () {
      const amount = balance;

      it('transfers the requested amount', async function () {
        await transfer.call(this, from, to, amount);

        expect(BigNumber.from(await this.token.balanceOf(from)))
          .to.be.bignumber.eql(BigNumber.from('0'));

        expect(BigNumber.from(await this.token.balanceOf(to)))
          .to.be.bignumber.eql(amount);
      });

      it('emits a transfer event', async function () {
        // see 2.b
        const { events } = await (await transfer.call(this, from, to, amount)).wait();

        // TODO : expectEvent.inLogs() is deprecated, we should use expectEvent() instead,
        expectEvent.inLogs(events, 'Transfer', {
          from,
          to,
          value: amount,
        });
      });
    });

    describe('when the sender transfers zero tokens', function () {
      const amount = BigNumber.from('0');

      it('transfers the requested amount', async function () {
        await transfer.call(this, from, to, amount);
        expect(BigNumber.from(await this.token.balanceOf(from)))
          .to.be.bignumber.eql(balance);

        expect(BigNumber.from(await this.token.balanceOf(to)))
          .to.be.bignumber.eql(BigNumber.from('0'));
      });

      it('emits a transfer event', async function () {
        const { events } = await (await transfer.call(this, from, to, amount)).wait();

        expectEvent.inLogs(events, 'Transfer', {
          from,
          to,
          value: amount,
        });
      });
    });
  });

  describe('when the recipient is the zero address', function () {
    it('reverts', async function () {
      await expectRevert(transfer.call(this, from, ZERO_ADDRESS, balance),
        `${errorPrefix}: transfer to the zero address`,
      );
    });
  });
}

function shouldBehaveLikeERC20Approve (errorPrefix, owner, spender, supply, approve) {
  describe('when the spender is not the zero address', function () {
    describe('when the sender has enough balance', function () {
      const amount = supply;

      it('emits an approval event', async function () {
        // see 2.b
        const { events } = await (await approve.call(this, owner, spender, amount)).wait();

        expectEvent.inLogs(events, 'Approval', {
          owner: owner,
          spender: spender,
          value: amount,
        });
      });

      describe('when there was no approved amount before', function () {
        it('approves the requested amount', async function () {
          await approve.call(this, owner, spender, amount);

          expect(BigNumber.from(await this.token.allowance(owner, spender)))
            .to.be.bignumber.eql(BigNumber.from(amount));
        });
      });

      describe('when the spender had an approved amount', function () {
        beforeEach(async function () {
          await approve.call(this, owner, spender, BigNumber.from(1));
        });

        it('approves the requested amount and replaces the previous one', async function () {
          await approve.call(this, owner, spender, amount);

          expect(BigNumber.from(await this.token.allowance(owner, spender)))
            .to.be.bignumber.eql(BigNumber.from(amount));
        });
      });
    });

    describe('when the sender does not have enough balance', function () {
      const amount = supply.add(1);

      it('emits an approval event', async function () {
        // see 2.b
        const { events } = await (await approve.call(this, owner, spender, amount)).wait();

        expectEvent.inLogs(events, 'Approval', {
          owner: owner,
          spender: spender,
          value: amount,
        });
      });

      describe('when there was no approved amount before', function () {
        it('approves the requested amount', async function () {
          await approve.call(this, owner, spender, amount);

          expect(BigNumber.from(await this.token.allowance(owner, spender)))
            .to.be.bignumber.eql(BigNumber.from(amount));
        });
      });

      describe('when the spender had an approved amount', function () {
        beforeEach(async function () {
          await approve.call(this, owner, spender, BigNumber.from(1));
        });

        it('approves the requested amount and replaces the previous one', async function () {
          await approve.call(this, owner, spender, amount);

          expect(BigNumber.from(await this.token.allowance(owner, spender)))
            .to.be.bignumber.eql(BigNumber.from(amount));
        });
      });
    });
  });

  describe('when the spender is the zero address', function () {
    it('reverts', async function () {
      await expectRevert(approve.call(this, owner, ZERO_ADDRESS, supply),
        `${errorPrefix}: approve to the zero address`,
      );
    });
  });
}

module.exports = {
  shouldBehaveLikeERC20,
  shouldBehaveLikeERC20Transfer,
  shouldBehaveLikeERC20Approve,
};
