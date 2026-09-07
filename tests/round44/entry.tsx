import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {BrokerTeamDirectoryReadOnlyPage} from '../../src/components/directory/BrokerTeamDirectoryReadOnlyPage';
import {state} from './backend';
const client = new QueryClient({defaultOptions: {queries: {retry: false, refetchOnWindowFocus: false}, mutations: {retry: false}}});
function App() {
  const [revision, setRevision] = useState(0);
  const [trace, setTrace] = useState('');
  return <QueryClientProvider client={client}>
    <select aria-label="Cenário" onChange={e => {state.mode=e.target.value;}}>{['success','loading','empty','denied','missing-manager','no-tenant','query-error','write-denied','conflict','write-error','already','slow','linked','directory-denied','refresh-failed'].map(mode=><option key={mode}>{mode}</option>)}</select>
    <button onClick={()=>{client.clear();state.calls=[];state.reads=0;state.lists=0;state.linked=state.mode==='linked';setRevision(revision+1);setTrace('');}}>Reiniciar teste</button>
    <button onClick={()=>setTrace(JSON.stringify(state))}>Evidência</button><pre>{trace}</pre>
    <BrokerTeamDirectoryReadOnlyPage key={revision} search={{view:'directory'}} />
  </QueryClientProvider>;
}
createRoot(document.getElementById('root')!).render(<App/>);
