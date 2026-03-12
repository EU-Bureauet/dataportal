import Image from "next/image";
import euBureauetLogo from "../img/EU-bureauet-logo.png";

export function EUBureauetLogo() {
    return (
        <Image src={euBureauetLogo} width={200} alt="EU-bureauet"/>
    );
}
