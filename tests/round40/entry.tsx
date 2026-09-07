import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {Route as Inventory} from '../../src/routes/_authenticated.admin.imoveis.index';
import {Route as NewProperty} from '../../src/routes/_authenticated.admin.imoveis.novo';
import {Route as Detail} from '../../src/routes/_authenticated.admin.imoveis.$id';
import {state} from './backend';
import {useLocation,navigate} from './router';
const qc=new QueryClient({defaultOptions:{queries:{retry:false,refetchOnWindowFocus:false},mutations:{retry:false}}});
function App(){const location=useLocation();const [trace,setTrace]=useState('');const [revision,setRevision]=useState(0);const Component=location.to==='/admin/imoveis/novo'?NewProperty.component:location.to==='/admin/imoveis/$id'?Detail.component:Inventory.component;return <QueryClientProvider client={qc}><label>Cenário<select aria-label="Cenário" onChange={e=>{state.mode=e.target.value;}}>{['success','loading','denied','unavailable','query-error','write-denied','ambiguous','slow','detail-error'].map(x=><option key={x}>{x}</option>)}</select></label><button onClick={()=>{qc.clear();state.rows=[];state.calls=[];state.reads=0;state.detailReads=[];state.forbidden=0;setRevision(revision+1);setTrace('');navigate({to:'/admin/imoveis'});}}>Reiniciar teste</button><button onClick={()=>setTrace(JSON.stringify(state))}>Evidência</button><pre aria-label="Evidência">{trace}</pre><Component key={revision+location.to}/></QueryClientProvider>;}
createRoot(document.getElementById('root')!).render(<App/>);
