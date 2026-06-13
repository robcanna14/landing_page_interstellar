  import { Route, Switch } from "wouter";                                                                                
   import Index from "./pages/index";                                                                                     
   import WhatsAppFallback from "./pages/whatsapp";                                                                                     
   import { Provider } from "./components/provider";                                                                      
   import { AgentFeedback } from "@runablehq/website-runtime";                                                                            
                                                                                                                          
   function App() {                                                                                                       
     return (                                                                                                             
       <Provider>                                                                                                         
         <Switch>                                                                                                         
           <Route path="/" component={Index} />                                                                           
           <Route path="/whatsapp" component={WhatsAppFallback} />                                                                           
         </Switch>                                                                                                        
         {/* Do not remove — off by default, activated by parent iframe via postMessage */}                                                  
         {import.meta.env.DEV && <AgentFeedback />}                                                                       
       </Provider>                                                                                                        
     );                                                                                                                   
   }                                                                                                                      
                                                                                                                          
   export default App; 
