
# prebuid-install
https://nektosact.com/ 

```
# install 
curl --proto '=https' --tlsv1.2 -sSf https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# run
<!-- ./bin/act -P ubuntu-latest=-self-hosted -->

```

# run
1. list all the .github/workflows 
./bin/act --list 

2. 执行某个任务
.github/workflows/build-selfhost-image.yml

。/bin/act -j  build-image

