import { Blockchain, SandboxContract, TreasuryContract, printTransactionFees } from '@ton/sandbox';
import { Cell, beginCell, toNano } from '@ton/core';
import { JettonStake, Mint } from '../wrappers/ExampleJetton';
import '@ton/test-utils';
import { buildJettonContent } from '../utils/ton-tep64';
import { jettonToSmallestUnit } from '../utils/math';

describe('JettonStake', () => {
    let blockchain: Blockchain;
    let owner: SandboxContract<TreasuryContract>;
    let alice: SandboxContract<TreasuryContract>;
    let bob: SandboxContract<TreasuryContract>;
    let jettonStake: SandboxContract<JettonStake>;

    beforeEach(async () => {
        const usdtJettonContent = buildJettonContent({
            name: 'USDT Token',
            description: 'USDT Token is a decentralized token, where you can create your own token and become a king.',
            symbol: 'USDT',
            decimals: '9',
            // image: 'https://avatars.githubusercontent.com/u/144251015?s=400&u=a25dfca41bdc6467d9783f5225c93f60e1513630&v=4',
        });
        console.log('usdtJettonContent', usdtJettonContent);
    
        const usdcJettonContent = buildJettonContent({
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

        expect(deployResult.transactions).toHaveTransaction({
            from: owner.address,
            to: jettonStake.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy jetton stake', async () => {
        // the check is done inside beforeEach
        // blockchain and nFTCollection are ready to use
    }); 

    it('should mint 1000000000 USDT to Alice', async () => {
        const usdtMasterAddress = await jettonStake.getGetUsdtMasterAddress();

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
        expect(mintResult.transactions).toHaveTransaction({
            from: owner.address,
            to: jettonStake.address,
            success: true,
        });
    }); 
});