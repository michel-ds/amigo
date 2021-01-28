SHELL = bash


all:
	docker run --volume=$(PWD):/opt/workspace --volume=$(HOME)/.aws:/root/.aws --workdir=/opt/workspace -t geerlingguy/docker-ubuntu1804-ansible:latest ansible-playbook -vvvv --connection=local --inventory 127.0.0.1,  --extra-vars "@variables.yaml" playbook.yaml

ansible:
	ansible-playbook -vvvv --connection=local --inventory 127.0.0.1,  --extra-vars "@variables.yaml" playbook.yaml

ansible-test:
	ansible-playbook -vvvv --connection=local --inventory 127.0.0.1,  --extra-vars "@variables.yaml" /dev/stdin <<<$$'---\n\n- hosts: all\n  become: true\n  roles:\n    - role: wazuh-agent'

test:
	cat <<< $$'---\n\n- hosts: all\n  become: true\n  roles:\n    - role: wazuh-agent'

oll:
	docker run --volume=$(PWD):/opt/workspace --volume=${HOME}/.aws:/root/.aws --workdir=/opt/workspace -t geerlingguy/docker-ubuntu1804-ansible:latest ansible-playbook -vvvv --connection=local --inventory 127.0.0.1,  --extra-vars "@variables.yaml" playbook.yaml

shell:
	docker run -it --volume=$(PWD):/opt/workspace --volume=$(HOME)/.aws:/root/.aws --workdir=/opt/workspace -t geerlingguy/docker-ubuntu1804-ansible:latest bash
	
oldall:
	vagrant provision

clean:
	vagrant destroy -f
	vagrant up

ssh:
	vagrant ssh


