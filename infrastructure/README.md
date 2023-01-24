
## Set Secrets

```
pulumi config set --path 'server.couchConfig.dbPass' $DB_PASS  --secret
pulumi config set --path 'server.couchConfig.dbUsername' $DB_USERNAME  --secret
pulumi config set --path 'server.couchConfig.accessJwtSignPk' $ACCESS_JWT_SIGN_PK  --secret
```

## SSH

```
export ec2Hostname=$(pulumi stack output ec2Hostname) && ssh -i "~/.ssh/testnet_data_nodes.pem" ec2-user@$ec2Hostname
```