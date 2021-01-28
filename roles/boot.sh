# ----------------- On boot
# TODO: Discover the manager IP rather than hard-code it here
#
INSTANCE_ID=`curl -s http://169.254.169.254/latest/meta-data/instance-id`
FILTERS="Name=resource-id,Values=$INSTANCE_ID Name=resource-type,Values=instance"
OPTIONS="--query Tags[].Value --output text --region $REGION"

APP=$(aws ec2 describe-tags --filters $FILTERS Name=key,Values=App $OPTIONS)
STACK=$(aws ec2 describe-tags --filters $FILTERS Name=key,Values=Stack $OPTIONS)
STAGE=$(aws ec2 describe-tags --filters $FILTERS Name=key,Values=Stage $OPTIONS)
MANAGER_IP="54.73.53.14"

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
/var/ossec/bin/agent-auth -m $MANAGER_IP -A $INSTANCE_ID

