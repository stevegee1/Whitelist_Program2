import {loadStdlib} from '@reach-sh/stdlib';
import * as backend from './build/index.main.mjs';
const stdlib = loadStdlib(process.env);

const startingBalance = stdlib.parseCurrency(100);

const creatorAcc = await stdlib.newTestAccount(startingBalance);
console.log(`created test account for Creator`)
const ctcCreator = creatorAcc.contract(backend);
console.log(`deployed the contract on the Creator`);

const fmt = (x) => stdlib.formatCurrency(x, 4);
const getBal = await stdlib.balanceOf(creatorAcc);
const balance = fmt(getBal);
console.log(`Balance of Creator account is ${balance}`)
//initializing a new non-network token
const supply = 10;
const name_ = "Josh";
const unit = "JSH";
const token_JSH = await stdlib.launchToken(creatorAcc,name_,unit,{ supply: supply, decimals: 4 });
const JSH = token_JSH.id;
const maxEntries = 5;
const duration = 20;
const params = { name_, supply, unit, JSH, maxEntries, duration};

let done = false;
let isPaying = true;
const whitelisted = []

const startJoining = async () => {
  console.log(`started joining...`);
  const runEntry = async (who) => {
    const acc = await stdlib.newTestAccount(startingBalance);
    acc.setDebugLabel(who);
    await acc.tokenAccept(JSH);
    const ctc = acc.contract(backend, ctcCreator.getInfo());
    try{
      await ctc.apis.Entrant.join();
      const [balance , bal_JSH] = await stdlib.balancesOf(acc,[null, JSH]);
      console.log(`${who} joined the whitelist with  ${fmt(balance)} network tokens and ${bal_JSH} non-network tokens`);
      if (whitelisted.length <= maxEntries) {
        whitelisted.push([who, acc , ctc]);
        console.log(whitelisted.length); 
      } 
    } catch(e) {
      console.log(e.message)
    }

  };
  
  await runEntry('Alice');
  await runEntry('Bob');
  await runEntry('John');
  // await runEntry('Jane');
  // await runEntry('Abe');
  // await runEntry('Claire');
  while (! done) {
    await stdlib.wait(1)
  }
}

const payEntrants = async () => {
  const payEntrant = async (who, acc ,ctc) => {
    try {
      await ctc.apis.Entrant.receiveToken();
      const [balance , bal_JSH] = await stdlib.balancesOf(acc,[null, JSH]);
      console.log(`${who} left the whitelist with  ${fmt(balance)} network tokens and ${bal_JSH} non-network tokens`);
    }
    catch (e){
      console.log(e)
    }
  }
  while(isPaying) {
    await stdlib.wait(1);
  }
}

console.log(`Starting Whitelist...`)
await ctcCreator.participants.Creator({
  createWhitelist: () => {
    console.log(`Created Whitelist with parameters `, params);
    return params;
  },
  ready: () => {
    startJoining();
  },
  seeJoin: (who, Address) => {
    console.log(`Creator saw that ${who} joined with Address ${Address}`);
  },
  showOutcome: (who,amount) => {
    console.log(`${who} received ${amount} tokens at the end of the whitelist`);
  },
  informTimeout: () => {
    console.log(`whitelist joining closed`);
  },
  reward: () => {
    payEntrants();
  },
  paying: () => {
    console.log(isPaying);
    return isPaying;
  }
})

// for(const [who, acc , ctc] of whitelisted) {
//   try {
//     await ctc.apis.Entrant.receiveToken();
//     const [balance , bal_JSH] = await stdlib.balancesOf(acc,[null, JSH], 4);
//     console.log(`${who} left the whitelist with  ${fmt(balance)} network tokens and ${bal_JSH} non-network tokens`);
//   }
//   catch (e){
//     console.log(e)
//   }
// }
done = true;
isPaying = false;








