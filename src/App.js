import { Provider } from "react-redux";
import Body from "./component/Body";
import "./index.css";
import AppStore from "./utils/AppStore";

function App() {
  return (
    <div>
      <Provider store={AppStore}>
        <Body />
      </Provider>
    </div>
  );
}

export default App;
