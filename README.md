## Multivac
### Demo: [Web4](https://web4.near.page) + [JSinRust](https://jsinrust.near.page)
> inspired by [this example](https://github.com/petersalomonsen/quickjs-rust-near/tree/main/examples/aiproxy), courtesy of `quickjs-rust-near`

## GUIDE

### 1. Deploy Contract
First, download and unzip `example_contracts` from here:
https://github.com/petersalomonsen/quickjs-rust-near/releases/tag/v0.0.4

Then, via CLI, navigate to the unzipped folder and run these commands:
```bash
near login
```

BEWARE - This costs 9 NEAR!
```bash
near deploy <account_id> minimum_web4.wasm
```

### 2. Download & Setup
Clone this repository:
```bash
git clone https://github.com/jlwaugh/multivac.git && cd multivac
```

Install dependencies:
```bash
npm install
```

### 3. Post JS & HTML

Prepare arguments:
```bash
export JSON_ARGS=$(cat ./main.js | jq -Rs '{javascript: .}')
```

Call `post_javascript` first:
```bash
near contract call-function as-transaction <account_id> post_javascript json-args $JSON_ARGS prepaid-gas '100.0 Tgas' attached-deposit '0 NEAR' sign-as <account_id> network-config testnet sign-with-keychain send
```

Call `post_content` to publish HTML:
```bash
near call <account_id> post_content '{
  "key": "/index.html",
  "valuebase64": "'"$(base64 < index.html | tr -d '\n')"'"
}' --accountId <account_id> --gas 30000000000000 --deposit 0
```

## TESTING

Navigate to your site: `https://<account_id>.page`
