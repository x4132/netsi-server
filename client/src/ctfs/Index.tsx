import { Route, Routes } from "react-router-dom";
import Add from "./Add";
import List from "./List";
import View from "./View";
import AddChallenge from "./AddChallenge";

export default function Index() {
    return (
        <Routes>
            <Route index element={<List />} />
            <Route path="add" element={<Add />} />
            <Route path=":ctfId" element={<View />} />
            <Route path=":ctfId/addChallenge" element={<AddChallenge />} />
        </Routes>
    )
}