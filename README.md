# parallel-full-twitter-server
```
export PATH=/guests/shohei/parallel-full-twitter-server/node_modules/forever/bin:$PATH;
npm stop --prefix /guests/shohei/parallel-full-twitter-server
CLIENTS=("tokyo005" "tokyo006" "tokyo007" "tokyo008" "tokyo009" "tokyo010" "tokyo003" "tokyo022" "tokyo023" "tokyo024" "tokyo025" "tokyo026" "tokyo027" "tokyo028" "tokyo029" "tokyo030")
for CLIENT in "${CLIENTS[@]}"
do
  echo "========================================================================"
  echo "${CLIENT}"
  echo "========================================================================"
  ssh ${CLIENT}-10g "export PATH=/data/local/twitter-shohei/${CLIENT}/node_modules/forever/bin:$PATH;npm stop --prefix /data/local/twitter-shohei/${CLIENT}/"
  ssh ${CLIENT}-10g "rsync -rlpgDuv /guests/shohei/parallel-full-twitter-client/* /data/local/twitter-shohei/${CLIENT}/ --delete --exclude=.git*"
  ssh ${CLIENT}-10g "export PATH=/data/local/twitter-shohei/${CLIENT}/node_modules/forever/bin:$PATH;npm start --prefix /data/local/twitter-shohei/${CLIENT}/"
done
npm start --prefix /guests/shohei/parallel-full-twitter-server


ssh tokyo005-10g "cd parallel-full-twitter-client/; node index.mjs"
ssh tokyo006-10g "npm start --prefix parallel-full-twitter-client/"
ssh tokyo007-10g "npm start --prefix parallel-full-twitter-client/"
ssh tokyo008-10g "npm start --prefix parallel-full-twitter-client/"
ssh tokyo009-10g "npm start --prefix parallel-full-twitter-client/"
ssh tokyo010-10g "npm start --prefix parallel-full-twitter-client/"
ssh tokyo003-10g "npm start --prefix parallel-full-twitter-client/"
ssh tokyo022-10g "npm start --prefix parallel-full-twitter-client/"
ssh tokyo023-10g "npm start --prefix parallel-full-twitter-client/"
ssh tokyo024-10g "npm start --prefix parallel-full-twitter-client/"
ssh tokyo025-10g "npm start --prefix parallel-full-twitter-client/"
ssh tokyo026-10g "npm start --prefix parallel-full-twitter-client/"
ssh tokyo027-10g "npm start --prefix parallel-full-twitter-client/"
ssh tokyo028-10g "npm start --prefix parallel-full-twitter-client/"
ssh tokyo029-10g "npm start --prefix parallel-full-twitter-client/"
ssh tokyo030-10g "npm start --prefix parallel-full-twitter-client/"
```

```
ssh tokyo005-10g npm stop --prefix parallel-full-twitter-client/
ssh tokyo006-10g npm stop --prefix parallel-full-twitter-client/
ssh tokyo007-10g npm stop --prefix parallel-full-twitter-client/
ssh tokyo008-10g npm stop --prefix parallel-full-twitter-client/
ssh tokyo009-10g npm stop --prefix parallel-full-twitter-client/
ssh tokyo010-10g npm stop --prefix parallel-full-twitter-client/
ssh tokyo003-10g npm stop --prefix parallel-full-twitter-client/
ssh tokyo022-10g npm stop --prefix parallel-full-twitter-client/
ssh tokyo023-10g npm stop --prefix parallel-full-twitter-client/
ssh tokyo024-10g npm stop --prefix parallel-full-twitter-client/
ssh tokyo025-10g npm stop --prefix parallel-full-twitter-client/
ssh tokyo026-10g npm stop --prefix parallel-full-twitter-client/
ssh tokyo027-10g npm stop --prefix parallel-full-twitter-client/
ssh tokyo028-10g npm stop --prefix parallel-full-twitter-client/
ssh tokyo029-10g npm stop --prefix parallel-full-twitter-client/
ssh tokyo030-10g npm stop --prefix parallel-full-twitter-client/
```



ssh tokyo005-10g "rsync -rlpgDu /guests/shohei/parallel-full-twitter-client/* /data/local/twitter-shohei/tokyo005 --delete --exclude=.git*"
ssh tokyo006-10g "rsync -rlpgDu /guests/shohei/parallel-full-twitter-client/* /data/local/twitter-shohei/tokyo006 --delete --exclude=.git*"
ssh tokyo007-10g "rsync -rlpgDu /guests/shohei/parallel-full-twitter-client/* /data/local/twitter-shohei/tokyo007 --delete --exclude=.git*"
ssh tokyo008-10g "rsync -rlpgDu /guests/shohei/parallel-full-twitter-client/* /data/local/twitter-shohei/tokyo008 --delete --exclude=.git*"
ssh tokyo009-10g "rsync -rlpgDu /guests/shohei/parallel-full-twitter-client/* /data/local/twitter-shohei/tokyo009 --delete --exclude=.git*"
ssh tokyo010-10g "rsync -rlpgDu /guests/shohei/parallel-full-twitter-client/* /data/local/twitter-shohei/tokyo010 --delete --exclude=.git*"
ssh tokyo003-10g "rsync -rlpgDu /guests/shohei/parallel-full-twitter-client/* /data/local/twitter-shohei/tokyo003 ---delete -exclude=.git*"
ssh tokyo022-10g "rsync -rlpgDu /guests/shohei/parallel-full-twitter-client/* /data/local/twitter-shohei/tokyo022 --delete --exclude=.git*"
ssh tokyo023-10g "rsync -rlpgDu /guests/shohei/parallel-full-twitter-client/* /data/local/twitter-shohei/tokyo023 --delete --exclude=.git*"
ssh tokyo024-10g "rsync -rlpgDu /guests/shohei/parallel-full-twitter-client/* /data/local/twitter-shohei/tokyo024 --delete --exclude=.git*"
ssh tokyo025-10g "rsync -rlpgDu /guests/shohei/parallel-full-twitter-client/* /data/local/twitter-shohei/tokyo025 --delete --exclude=.git*"
ssh tokyo026-10g "rsync -rlpgDu /guests/shohei/parallel-full-twitter-client/* /data/local/twitter-shohei/tokyo026 --delete --exclude=.git*"
ssh tokyo027-10g "rsync -rlpgDu /guests/shohei/parallel-full-twitter-client/* /data/local/twitter-shohei/tokyo027 --delete --exclude=.git*"
ssh tokyo028-10g "rsync -rlpgDu /guests/shohei/parallel-full-twitter-client/* /data/local/twitter-shohei/tokyo028 --delete --exclude=.git*"
ssh tokyo029-10g "rsync -rlpgDu /guests/shohei/parallel-full-twitter-client/* /data/local/twitter-shohei/tokyo029 --delete --exclude=.git*"
ssh tokyo030-10g "rsync -rlpgDu /guests/shohei/parallel-full-twitter-client/* /data/local/twitter-shohei/tokyo030 --delete --exclude=.git*"