import React, {useSyncExternalStore} from 'react';
const listeners=new Set<()=>void>();
let location={to:'/admin/imoveis',params:{} as any,search:{} as any};
export const navigate=(next:any)=>{location={...next,params:next.params??{},search:next.search??{}};listeners.forEach(f=>f());};
export const useLocation=()=>useSyncExternalStore(f=>{listeners.add(f);return()=>{listeners.delete(f);};},()=>location);
export const useNavigate=()=>navigate;
export const createFileRoute=(_path:string)=>(options:any)=>({...options,useParams:()=>location.params,useSearch:()=>location.search});
export const Link=React.forwardRef<HTMLAnchorElement,any>(({to,params,search,children,...rest},ref)=><a {...rest} ref={ref} href={to} onClick={e=>{e.preventDefault();navigate({to,params,search});}}>{children}</a>);
