yarn hardhat run scripts/1-sample-deploy.ts --network localhost
echo "Enter account address:"
read ACCOUNT
echo "Enter contract address:"
read CONTRACT

echo "Admin: $ACCOUNT, Contract: $CONTRACT"
