
import { Cell, Dictionary, beginCell, toNano } from '@ton/core';
import { JettonStake } from '../wrappers/ExampleJetton';
import { NetworkProvider } from '@ton/blueprint';
import { buildJettonContent } from '../utils/ton-tep64';

export async function run(provider: NetworkProvider) {
    const deployer = provider.sender();
    console.log('Deploying contract with deployer address', deployer.address);
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

    let jettonStake = provider.open(await JettonStake.fromInit(deployer.address!, usdtJettonContent, usdcJettonContent));
    await jettonStake.send(
        provider.sender(),
        {
            value: toNano('0.1'),
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        }
    ); 

    await provider.waitForDeploy(jettonStake.address);
}
