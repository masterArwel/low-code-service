NVM_SOURCE=~/.nvm/nvm.sh
ifndef JENKINS_HOME
	NVM_SOURCE=`brew --prefix nvm`/nvm.sh
endif
TARGET_NODE_VERSION=v18.19.1

.PHONY: build
build:
	source $(NVM_SOURCE); \
	nvm ls $(TARGET_NODE_VERSION); \
	if [ $$? -eq 0 ]; \
	then \
		echo "node $(TARGET_NODE_VERSION) is installed, skipping..."; \
	else \
		echo "node $(TARGET_NODE_VERSION) is uninstalled. Now installing..."; \
		export NVM_NODEJS_ORG_MIRROR=https://npm.taobao.org/mirrors/node; \
		nvm install $(TARGET_NODE_VERSION); \
	fi; \
	export NVM_DIR=~/.nvm; \
	nvm use $(TARGET_NODE_VERSION); \
	rm -f AppLowCodeCompileService.zip; \
	npm install && npm run build; \
	rsync -arv --exclude=node_modules --exclude=.git . AppLowCodeCompileService && \
	zip -ry AppLowCodeCompileService.zip AppLowCodeCompileService; \
	rm -r AppLowCodeCompileService; \

dev: 
	npm run dev