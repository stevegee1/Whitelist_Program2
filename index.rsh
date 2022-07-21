'reach 0.1';

const WLParams = Object({ name_: Bytes(4),
                          supply: UInt,
                          unit: Bytes(3),
                          JSH: Token,
                          maxEntries: UInt,
                          duration: UInt, });

export const main = Reach.App(() => {
  setOptions({ untrustworthyMaps: true });
  const Creator = Participant('Creator', {
    createWhitelist: Fun([], WLParams),
    ready: Fun([],Null),
    seeJoin: Fun([Address,Address],Null),
    showOutcome: Fun([Address,UInt],Null),
    informTimeout: Fun([],Null),
    reward: Fun([],Null),
    paying: Fun([], Bool),
  });
  const Entrant = API('Entrant', { 
    join: Fun([],Null),
    receiveToken: Fun([],Null),
  });
  init();
  //Creator deploys the contract
  Creator.only(() => {
    const {
      name_,
      supply,
      unit,
      JSH,
      maxEntries,
      duration
    } = declassify(interact.createWhitelist());
  });
  
  Creator.publish(name_,
                  supply,
                  unit,
                  JSH,
                  maxEntries,
                  duration);
  commit();
  Creator.publish();
  Creator.interact.ready(); 
  
  const timeOut = relativeTime(duration);
  const entrants = new Set();

  const 
  [ isOpen,
    entries ] =
    parallelReduce([ true, 0 ])
    .invariant(entries <= maxEntries)
    .while(isOpen && entries < maxEntries)
    .api_(Entrant.join, () => {
      check(!entrants.member(this))
      return [ (notify) => {
        notify(null);
        const who = this;
        entrants.insert(who);
        Creator.interact.seeJoin(who,who);
        return [ true, entries + 1 ];
      }];
    })
    .timeout(timeOut,() => {
      Creator.publish()
      Creator.interact.informTimeout();
      return [false, entries];
    });


  const payout = supply/entries;
  Creator.interact.reward();

  const 
  [ unpaidEntrants,
    isPaying ] = 
      parallelReduce([ entries, true ])
      .invariant(entries <= maxEntries)
      .paySpec([JSH])
      .while(isPaying && unpaidEntrants > 0)
      .case(Creator, 
        ( ) => ({when: declassify(interact.paying())}),
        (_) => [0, [payout,JSH] ],
        (_) => { return [unpaidEntrants,true]; }
      )
      .api_(Entrant.receiveToken, () => {
        check(entrants.member(this))
        return[[0,[0,JSH]],(k) => {
          const who = this;
          k(null);
          entrants.remove(who);
          
transfer(balance(JSH), JSH).to(who);
          return [ unpaidEntrants - 1, true];
        }]
      })
      .timeout(false)

  transfer(balance(JSH),JSH).to(Creator);
  transfer(balance()).to(Creator);
  commit();
  exit();
});
