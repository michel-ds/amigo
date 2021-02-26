#!/bin/bash
aws ssm --region "$1" get-parameter --name "$2" --with-decryption --profile deployTools | jq -r '.Parameter.Value'
