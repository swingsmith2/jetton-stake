import { Blockchain, SandboxContract, TreasuryContract, printTransactionFees } from '@ton/sandbox';
import { Cell, beginCell, toNano } from '@ton/core';
import { JettonStake, Mint, Deposit, Withdraw, ExampleJettonMaster, ExampleJettonWallet, JettonTransfer, JettonTransferNotification } from '../wrappers/ExampleJetton';
import '@ton/test-utils';
import { buildJettonContent } from '../utils/ton-tep64';
import { jettonToSmallestUnit } from '../utils/math';
import { loadJettonTransfer } from '../build/ExampleJetton/tact_ExampleJettonMaster';

describe('JettonStake', () => {
    let blockchain: Blockchain;
    let owner: SandboxContract<TreasuryContract>;
    let alice: SandboxContract<TreasuryContract>;
    let bob: SandboxContract<TreasuryContract>;
    let jettonStake: SandboxContract<JettonStake>;
    let usdtJettonContent: Cell;
    let usdcJettonContent: Cell;

    let query_id = 1_000_000n;

    beforeEach(async () => {
        usdtJettonContent = buildJettonContent({
            name: 'USDT Token',
            description: 'USDT Token is a decentralized token, where you can create your own token and become a king.',
            symbol: 'USDT',
            decimals: '9',
            // image: 'https://avatars.githubusercontent.com/u/144251015?s=400&u=a25dfca41bdc6467d9783f5225c93f60e1513630&v=4',
        });
        console.log('usdtJettonContent', usdtJettonContent);

        usdcJettonContent = buildJettonContent({
            name: 'USDC Token',
            description: 'USDC Token is a decentralized token, where you can create your own token and become a king.',
            symbol: 'USDC',
            decimals: '9',
        });
        console.log('usdcJettonContent', usdcJettonContent);

        blockchain = await Blockchain.create();
        owner = await blockchain.treasury('owner');
        alice = await blockchain.treasury('alice');
        bob = await blockchain.treasury('bob');
        jettonStake = await blockchain.openContract(await JettonStake.fromInit(owner.address, usdtJettonContent, usdcJettonContent));
        const deployResult = await jettonStake.send(
            owner.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            }
        );
        //mint 1000000000 USDT to owner,alice,bob
        const usdtMasterAddress = await jettonStake.getGetUsdtMasterAddress();

        const ownerUsdtWallet = await blockchain.openContract(await ExampleJettonWallet.fromInit(owner.address, usdtMasterAddress));
        const aliceUsdtWallet = await blockchain.openContract(await ExampleJettonWallet.fromInit(owner.address, usdtMasterAddress));

        const ownerMint: Mint = {
            $$type: 'Mint',
            jetton: usdtMasterAddress,
            amount: 100_000_000_000n,
            receiver: owner.address,
        };
        const aliceMint: Mint = {
            $$type: 'Mint',
            jetton: usdtMasterAddress,
            amount: 1_000_000_000n,
            receiver: alice.address,
        };
        const mintResult = await jettonStake.send(
            owner.getSender(),
            {
                value: toNano('0.05'),
            },
            ownerMint
        );
        console.log('mintResult', mintResult);
        let notification: JettonTransferNotification = {
            $$type: 'JettonTransferNotification',
            query_id: query_id,
            amount: 1_000_000_000n,
            sender: owner.address,
            forward_payload: beginCell().endCell().asSlice(),   
        };
        await ownerUsdtWallet.send(
            owner.getSender(),
            {
                value: toNano('0.05'),
            },
            notification
        );
        const aliceMintResult = await jettonStake.send(
            owner.getSender(),
            {
                value: toNano('0.05'),
            },
            aliceMint
        );
        console.log('aliceMintResult', aliceMintResult);

        const transfer: JettonTransfer = {
            $$type: "JettonTransfer",
            query_id: query_id,
            amount: 1_000_000_000n,
            destination: alice.address,
            response_destination: alice.address,
            custom_payload: null,
            forward_ton_amount: 0n,
            forward_payload: beginCell().endCell().asSlice(), 
        };
        await ownerUsdtWallet.send(
            owner.getSender(),
            {
                value: toNano('0.05'),
            },
            transfer
        );
        query_id++;

        //transfer 1000000000 USDT from owner to bob
        const bobTransfer: JettonTransfer = {
            $$type: "JettonTransfer",
            query_id: query_id,
            amount: 1_000_000_000n,
            destination: bob.address,
            response_destination: bob.address,
            custom_payload: null,
            forward_ton_amount: 0n,
            forward_payload: beginCell().endCell().asSlice(), 
        };  
        await ownerUsdtWallet.send(
            owner.getSender(),
            {
                value: toNano('0.05'),
            },
            bobTransfer
        );
        query_id++;
    });

    it('should deploy jetton stake', async () => {
        // the check is done inside beforeEach
        // blockchain and nFTCollection are ready to use
    });

    it('should mint 1000000000 USDT to Alice', async () => {
        const usdtMasterAddress = await jettonStake.getGetUsdtMasterAddress();
        const aliceUsdtWallet = await blockchain.openContract(await ExampleJettonWallet.fromInit(owner.address, usdtMasterAddress));
        //transfer 1000000000 USDT from alice to bob
        const transfer: JettonTransfer = {
            $$type: "JettonTransfer",
            query_id: query_id,
            amount: 100_000_000n,
            destination: bob.address,
            response_destination: bob.address,
            custom_payload: null,
            forward_ton_amount: 0n,
            forward_payload: beginCell().endCell().asSlice(), 
        };
        await aliceUsdtWallet.send(
            alice.getSender(),
            {
                value: toNano('0.05'),
            },
            transfer
        );
        query_id++;

        //check balance of alice
        const aliceBeforeUsdtBalance = (await aliceUsdtWallet.getGetWalletData()).balance;
        console.log('aliceBeforeUsdtBalance', aliceBeforeUsdtBalance);

        const mint: Mint = {
            $$type: "Mint",
            jetton: usdtMasterAddress,
            amount: 1_000_000_000n,
            receiver: alice.address,
        };
        let mintResult = await jettonStake.send(
            owner.getSender(),
            {
                value: toNano('0.05'),
            },
            mint
        );

        const aliceAfterUsdtBalance = (await aliceUsdtWallet.getGetWalletData()).balance;
        console.log('aliceAfterUsdtBalance', aliceAfterUsdtBalance);
        expect(aliceAfterUsdtBalance).toEqual(aliceBeforeUsdtBalance + 1_000_000_000n);
    });

    it('should alise deposit 1000000000 USDT', async () => {
        const usdtMasterAddress = await jettonStake.getGetUsdtMasterAddress();
        const aliceUsdtWallet = await blockchain.openContract(await ExampleJettonWallet.fromInit(owner.address, usdtMasterAddress));
        
        //transfer 1000000000 USDT from alice to bob
        const transfer: JettonTransfer = {
            $$type: "JettonTransfer",
            query_id: query_id,
            amount: 1_000_000_000n,
            destination: bob.address,
            response_destination: bob.address,
            custom_payload: null,
            forward_ton_amount: 0n,
            forward_payload: beginCell().endCell().asSlice(), 
        };
        await aliceUsdtWallet.send(
            alice.getSender(),
            {
                value: toNano('0.05'),
            },
            transfer
        );
        query_id++;

        const aliceBeforeUsdtBalance = (await aliceUsdtWallet.getGetWalletData()).balance;
        console.log('aliceBeforeUsdtBalance', aliceBeforeUsdtBalance);

        //check balance of alice
        const aliceBeforeDepositUsdtBalance = await jettonStake.getGetDepositUsdtBalance(alice.address);
        console.log('aliceBeforeDepositUsdtBalance', aliceBeforeDepositUsdtBalance);

        const deposit: Deposit = {
            $$type: 'Deposit',
            jetton: usdtMasterAddress,
            amount: 1_000_000_000n,
        };
        let depositResult = await jettonStake.send(
            alice.getSender(),
            {
                value: toNano('0.05'),
            },
            deposit
        );

        const aliceAfterUsdtBalance = (await aliceUsdtWallet.getGetWalletData()).balance;
        console.log('aliceAfterUsdtBalance', aliceAfterUsdtBalance);
        expect(aliceAfterUsdtBalance).toEqual(aliceBeforeUsdtBalance - 1_000_000_000n);

        const aliceAfterDepositUsdtBalance = await jettonStake.getGetDepositUsdtBalance(alice.address);
        console.log('aliceAfterDepositUsdtBalance', aliceAfterDepositUsdtBalance);
        expect(aliceAfterDepositUsdtBalance).toEqual(aliceBeforeDepositUsdtBalance + 1_000_000_000n);
    });

    it('should alise withdraw 1000000000 USDT', async () => {
        const usdtMasterAddress = await jettonStake.getGetUsdtMasterAddress();
        const aliceUsdtWallet = await blockchain.openContract(await ExampleJettonWallet.fromInit(owner.address, usdtMasterAddress));
        
        //transfer 1000000000 USDT from alice to bob
        const aliceUsdtTransfer: JettonTransfer = {
            $$type: "JettonTransfer",
            query_id: query_id,
            amount: 1_000_000_000n,
            destination: bob.address,
            response_destination: bob.address,
            custom_payload: null,
            forward_ton_amount: 0n,
            forward_payload: beginCell().endCell().asSlice(), 
        };
        await aliceUsdtWallet.send(
            alice.getSender(),
            {
                value: toNano('0.05'),
            },
            aliceUsdtTransfer
        );
        query_id++;

        //deposit 1000000000 USDT
        const deposit: Deposit = {
            $$type: 'Deposit',
            jetton: usdtMasterAddress,
            amount: 1_000_000_000n,
        };
        await jettonStake.send(
            alice.getSender(),
            {
                value: toNano('0.05'),
            },
            deposit
        );

        const aliceBeforeUsdtBalance = (await aliceUsdtWallet.getGetWalletData()).balance;
        console.log('aliceBeforeUsdtBalance', aliceBeforeUsdtBalance);

        const aliceBeforeWithdrawUsdtBalance = await jettonStake.getGetDepositUsdtBalance(alice.address);
        console.log('aliceBeforeWithdrawUsdtBalance', aliceBeforeWithdrawUsdtBalance);

        const withdraw: Withdraw = {
            $$type: 'Withdraw',
            jetton: usdtMasterAddress,
            amount: 1_000_000_000n,
            receiver: alice.address,
        };
        let withdrawResult = await jettonStake.send(
            alice.getSender(),
            {
                value: toNano('0.05'),
            },
            withdraw
        );

        const aliceAfterUsdtBalance = (await aliceUsdtWallet.getGetWalletData()).balance;
        console.log('aliceAfterUsdtBalance', aliceAfterUsdtBalance);
        expect(aliceAfterUsdtBalance).toEqual(aliceBeforeUsdtBalance + 1_000_000_000n);

        const aliceAfterWithdrawUsdtBalance = await jettonStake.getGetDepositUsdtBalance(alice.address);
        console.log('aliceAfterWithdrawUsdtBalance', aliceAfterWithdrawUsdtBalance);
        expect(aliceAfterWithdrawUsdtBalance).toEqual(aliceBeforeWithdrawUsdtBalance - 1_000_000_000n);
    });
});
