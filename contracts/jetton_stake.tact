import "@stdlib/deploy";
import "@stdlib/ownable";
import "./jetton_example.tact";

// message JettonMint {
//     origin: Address;        // address of origin mint request (may be wallet v4)
//     receiver: Address;      // address of receiver
//     amount: Int;            // amount of jettons to mint
//     custom_payload: Cell?;  // optional custom data
//     forward_ton_amount: Int as coins;
//     forward_payload: Slice as remaining;
// }

// message(0x0f8a7ea5) JettonTransfer {
//     query_id: Int as uint64;                // arbitrary request number
//     amount: Int as coins;                   // amount of jettons to transfer
//     destination: Address;                   // address of the new owner of the jettons
//     response_destination: Address;          // address where to send a response with confirmation of a successful transfer and the rest of the incoming message Toncoins.
//     custom_payload: Cell?;                  // optional custom payload
//     forward_ton_amount: Int as coins;       // the amount of nanotons to be sent to the destination address.
//     forward_payload: Slice as remaining;    // optional custom data that should be sent to the destination address.
// }

message Mint {
    jetton: Address;
    amount: Int;
    receiver: Address;
}

message Deposit {
    jetton: Address;
    amount: Int;
}

message Withdraw {
    jetton: Address;
    amount: Int;
    receiver: Address;
}

struct DepositInfo {
    sender: Address;
    jetton: Address;
    amount: Int;
    query_id: Int;
}

contract JettonStake with Deployable, OwnableTransferable {
    owner: Address;
    usdt_content: Cell;
    usdc_content: Cell;

    usdt_master: Address;
    usdc_master: Address;

    usdt_balances: map<Address, Int>;
    usdc_balances: map<Address, Int>;

    deposit_count: Int;
    withdraw_count: Int;

    deposit_infos: map<Int, DepositInfo>;

    JETTON_TRANSFER_GAS: Int;

    init(owner: Address, usdt_content: Cell, usdc_content: Cell) {
        self.owner = owner;
        self.usdt_content = usdt_content;
        self.usdc_content = usdc_content;

        self.JETTON_TRANSFER_GAS = ton("0.05");

        let usdtInit: StateInit = initOf ExampleJettonMaster(self.owner, self.usdt_content);
        self.usdt_master = contractAddress(usdtInit);

        let usdcInit: StateInit = initOf ExampleJettonMaster(self.owner, self.usdc_content);
        self.usdc_master = contractAddress(usdcInit);

        self.usdt_balances = emptyMap();
        self.usdc_balances = emptyMap();
        self.deposit_infos = emptyMap();

        self.deposit_count = 10000000;
        self.withdraw_count = 10000000;
    }

    receive(msg: Mint) {
        self.mintJetton(msg);
    }

    receive(msg: Deposit) {
        self.deposit(msg);
    }

    receive(msg: Withdraw) {
        self.withdraw(msg);
    }

    receive(msg: JettonTransferNotification) {
        self.process_notification(msg);
    }

    inline fun deposit(msg: Deposit) {
        require(msg.jetton == self.usdt_master || msg.jetton == self.usdc_master, "Deposit: Invalid jetton");
        require(msg.amount > 0, "Deposit: Amount must be greater than 0");

        let deposit_info: DepositInfo = DepositInfo{
                sender: sender(),
                jetton: msg.jetton,
                amount: msg.amount,
                query_id: self.deposit_count
            };
        self.deposit_infos.set(self.deposit_count, deposit_info);

        if (msg.jetton == self.usdt_master) {

            let jettonTransfer : JettonTransfer = JettonTransfer{
                query_id: self.deposit_count,
                amount: msg.amount,
                destination: myAddress(),
                response_destination: myAddress(),
                custom_payload: null,
                forward_ton_amount: 1,
                forward_payload: rawSlice("F")
            };
            send(SendParameters{
                to: self.calculate_usdt_wallet_address(sender()),
                value: self.JETTON_TRANSFER_GAS,
                body: jettonTransfer.toCell(),
            });
        } else if (msg.jetton == self.usdc_master) {
            let jettonTransfer : JettonTransfer = JettonTransfer{
                query_id: self.deposit_count,
                amount: msg.amount,
                destination: myAddress(),
                response_destination: myAddress(),
                custom_payload: null,
                forward_ton_amount: 1,
                forward_payload: rawSlice("F")
            };
            send(SendParameters{
                to: self.calculate_usdc_wallet_address(sender()),
                value: self.JETTON_TRANSFER_GAS,
                body: jettonTransfer.toCell(),
            });
        }

        self.deposit_count = self.deposit_count + 1;
    }

    inline fun withdraw(msg: Withdraw) {
        require(msg.jetton == self.usdt_master || msg.jetton == self.usdc_master, "Withdraw: Invalid jetton");
        require(msg.amount > 0, "Withdraw: Amount must be greater than 0");

        if (msg.jetton == self.usdt_master) {
            if (self.usdt_balances.exists(sender())) {
                let balance: Int = self.usdt_balances.get(sender())!!;
                require(balance >= msg.amount, "Withdraw: Insufficient balance");
                self.usdt_balances.set(sender(), balance - msg.amount);
            } else {
                require(false, "Withdraw: Insufficient balance");
            }
            let jettonTransfer : JettonTransfer = JettonTransfer{
                query_id: self.withdraw_count,
                amount: msg.amount,
                destination: msg.receiver,
                response_destination: msg.receiver,
                custom_payload: null,
                forward_ton_amount: 1,
                forward_payload: rawSlice("F")
            };
            send(SendParameters{
                to: self.calculate_usdt_wallet_address(myAddress()),
                value: self.JETTON_TRANSFER_GAS,
                body: jettonTransfer.toCell(),
            });

            self.withdraw_count = self.withdraw_count + 1;
        } else if (msg.jetton == self.usdc_master) {
            if (self.usdc_balances.exists(sender())) {
                let balance: Int = self.usdc_balances.get(sender())!!;
                require(balance >= msg.amount, "Withdraw: Insufficient balance");
                self.usdc_balances.set(sender(), balance - msg.amount);
            } else {
                require(false, "Withdraw: Insufficient balance");
            }

            let jettonTransfer : JettonTransfer = JettonTransfer{
                query_id: self.withdraw_count,
                amount: msg.amount,
                destination: msg.receiver,
                response_destination: msg.receiver,
                custom_payload: null,
                forward_ton_amount: 1,
                forward_payload: rawSlice("F")
            };
            send(SendParameters{
                to: self.calculate_usdc_wallet_address(myAddress()),
                value: self.JETTON_TRANSFER_GAS,
                body: jettonTransfer.toCell(),
            });

            self.withdraw_count = self.withdraw_count + 1;
        }
    }

    inline fun mintJetton(msg: Mint) {
        require(msg.jetton == self.usdt_master || msg.jetton == self.usdc_master, "Mint: Invalid jetton");
        require(sender() == self.owner, "Mint: Only owner can mint");

        if (msg.jetton == self.usdt_master) {
            let jettonMint: JettonMint = JettonMint{
                origin: sender(),
                receiver: msg.receiver,
                amount: msg.amount,
                custom_payload: null,
                forward_ton_amount: 1,
                forward_payload: rawSlice("F")
            };
            send(SendParameters{
                to: self.usdt_master,
                value: self.JETTON_TRANSFER_GAS,
                body: jettonMint.toCell(),
            });
       } else if (msg.jetton == self.usdc_master) {
            let jettonMint: JettonMint = JettonMint{
                origin: sender(),
                receiver: msg.receiver,
                amount: msg.amount,
                custom_payload: null,
                forward_ton_amount: 1,
                forward_payload: rawSlice("F")
            };
            send(SendParameters{
                to: self.usdc_master,
                value: self.JETTON_TRANSFER_GAS,
                body: jettonMint.toCell(),
            });
       }
    }

    inline fun process_notification(notification: JettonTransferNotification) {
        require(notification.sender == sender(), "Notification not from your jetton wallet!");
        let deposit_info: DepositInfo = self.deposit_infos.get(notification.query_id)!!;
        require(deposit_info.sender == sender(), "Notification not from your deposit!");
        require(notification.amount == deposit_info.amount, "Notification amount must be equal to deposit amount!");
        
        if (deposit_info.jetton == self.usdt_master) {
            if (self.usdt_balances.exists(deposit_info.sender)) {
                let balance: Int = self.usdt_balances.get(deposit_info.sender)!!;
                self.usdt_balances.set(deposit_info.sender, balance + notification.amount);
            } else {
                self.usdt_balances.set(deposit_info.sender, notification.amount);
            }
        } else if (deposit_info.jetton == self.usdc_master) {
            if (self.usdc_balances.exists(deposit_info.sender)) {
                let balance: Int = self.usdc_balances.get(deposit_info.sender)!!;
                self.usdc_balances.set(deposit_info.sender, balance + notification.amount);
            } else {
                self.usdc_balances.set(deposit_info.sender, notification.amount);
            }
        }

        self.deposit_infos.del(notification.query_id);
    }

    inline fun calculate_usdt_wallet_address(user_address: Address): Address {     
        let usdtInit: StateInit = initOf ExampleJettonWallet(user_address, self.usdt_master);
        return contractAddress(usdtInit);
    }

    inline fun calculate_usdc_wallet_address(user_address: Address): Address {
        let usdcInit: StateInit = initOf ExampleJettonWallet(user_address, self.usdc_master);
        return contractAddress(usdcInit);
    }

    get fun get_usdt_master_address(): Address {
        return self.usdt_master;
    }

    get fun get_usdc_master_address(): Address {
        return self.usdc_master;
    }

    get fun get_usdt_wallet_address(user_address: Address): Address {
        return self.calculate_usdt_wallet_address(user_address);
    }

    get fun get_usdc_wallet_address(user_address: Address): Address {
        return self.calculate_usdc_wallet_address(user_address);
    }

    get fun get_deposit_usdt_balance(user_address: Address): Int {
        if (self.usdt_balances.exists(user_address)) {
            return self.usdt_balances.get(user_address)!!;
        } else {
            return 0;
        }
    }

    get fun get_deposit_usdc_balance(user_address: Address): Int {
        if (self.usdc_balances.exists(user_address)) {
            return self.usdc_balances.get(user_address)!!;
        } else {
            return 0;
        }
    }

    get fun get_deposit_count(): Int {
        return self.deposit_count;
    }

    get fun get_withdraw_count(): Int {
        return self.withdraw_count;
    }

    get fun get_usdt_content(): Cell {
        return self.usdt_content;
    }

    get fun get_usdc_content(): Cell {
        return self.usdc_content;
    }

    get fun get_owner(): Address {
        return self.owner;
    }
}