import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    lang: 'tact',
    target: 'contracts/jetton_stake.tact',
    options: {
        debug: true,
        // interfacesGetter: true,
    },
};
    