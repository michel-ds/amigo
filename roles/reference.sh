#!/bin/bash -ev

type aws >& /dev/null || ( echo 'AWS CLI tools required' && exit 1 )

# ----------------- Install packages and dependencies

apt-get install -y curl apt-transport-https lsb-release gnupg2
curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | apt-key add -
echo "deb https://packages.wazuh.com/3.x/apt/ stable main" | tee /etc/apt/sources.list.d/wazuh.list
apt-get update
apt-get install wazuh-agent=3.13.1-1

sed -i "s/^deb/#deb/" /etc/apt/sources.list.d/wazuh.list
apt-get update

# ----------------- Discover instance ID and tags

INSTANCE_ID=`curl -s http://169.254.169.254/latest/meta-data/instance-id`
REGION=`curl -s http://169.254.169.254/latest/meta-data/placement/availability-zone | sed 's/.$//'`

FILTERS="Name=resource-id,Values=$INSTANCE_ID Name=resource-type,Values=instance"
OPTIONS="--query Tags[].Value --output text --region $REGION"

APP=$(aws ec2 describe-tags --filters $FILTERS Name=key,Values=App $OPTIONS)
STACK=$(aws ec2 describe-tags --filters $FILTERS Name=key,Values=Stack $OPTIONS)
STAGE=$(aws ec2 describe-tags --filters $FILTERS Name=key,Values=Stage $OPTIONS)

# ----------------- Store the password and register the agent

SECRET_ARN="arn:aws:secretsmanager:eu-west-1:040481135564:secret:WazuhRegistration-tiW8U3"

echo $(aws secretsmanager get-secret-value --secret-id $SECRET_ARN \
  --query SecretString --output text --region $REGION \
  | jq -r .RegistrationSecret) > /var/ossec/etc/authd.pass

# TODO: Discover the manager IP rather than hard-code it here
MANAGER_IP="54.73.53.14"

/var/ossec/bin/agent-auth -m $MANAGER_IP -A $INSTANCE_ID

# ----------------- Configure the agent and restart the service

cp /var/ossec/etc/ossec.conf /var/ossec/etc/ossec.conf.bak

sed -i "s/MANAGER_IP/$MANAGER_IP/" /var/ossec/etc/ossec.conf
sed -i "s/<protocol>udp<\/protocol>/<protocol>tcp<\/protocol>/" /var/ossec/etc/ossec.conf

cat >> /var/ossec/etc/ossec.conf << EOF
<ossec_config>
  <labels>
    <label key="aws.app">$APP</label>
    <label key="aws.stack">$STACK</label>
    <label key="aws.stage">$STAGE</label>
  </labels>
</ossec_config>
EOF

systemctl restart wazuh-agent
