import { useId, useState } from "react";
import "./memory-scene.css";

// Places never move within a route. The architecture and objects give each
// route a spatial identity; the law remains in the original station content.
import { SCENES } from "./scene-config.js";

function Person({ x, y, color = "#376457", scale = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} className="ms-person">
      <ellipse cx="0" cy="24" rx="12" ry="4" fill="#193d3320" />
      <path
        d="M-5 13-7 24M5 13 7 24"
        fill="none"
        stroke="#29443b"
        strokeWidth="4"
      />
      <path d="M-11 11Q-10-1 0-1Q10-1 11 11L8 16H-8Z" fill={color} />
      <circle cy="-8" r="7" fill="#d8b789" />
      <path d="M-7-9Q-7-18 2-15Q8-14 7-7L4-10Z" fill="#32443a" />
    </g>
  );
}

function Plant({ x, y, scale = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cy="17" rx="17" ry="5" fill="#27473715" />
      <path
        d="M-11 1H11L8 17H-8Z"
        fill="#b17f55"
        stroke="#8e6545"
        strokeWidth="1.5"
      />
      <path
        d="M0 3V-29M-1-7Q-31-3-22-27Q-5-26-1-7M0-15Q25-10 24-32Q4-31 0-15M0-23Q-13-49 3-52Q18-38 0-23"
        fill="#618472"
        stroke="#365a48"
        strokeWidth="1.5"
      />
    </g>
  );
}

function Window({ x, y, width = 70, height = 56 }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect
        width={width}
        height={height}
        rx="3"
        fill="#b9cfca"
        stroke="#42675a"
        strokeWidth="2"
      />
      <path
        d={`M${width / 2} 0V${height}M0 ${height / 2}H${width}`}
        stroke="#42675a"
        strokeWidth="2"
      />
      <path
        d={`M7 ${height - 8} ${width - 9} 8`}
        stroke="#e8f1df"
        strokeWidth="5"
        opacity=".6"
      />
      <path
        d={`M-5 ${height + 3}H${width + 5}`}
        stroke="#c2ae86"
        strokeWidth="6"
      />
    </g>
  );
}

function Bench({ x, y, width = 85 }) {
  return (
    <g
      transform={`translate(${x} ${y})`}
      stroke="#6c654b"
      strokeWidth="2"
      fill="#b39766"
    >
      <path d={`M0 0H${width}V16H0Z`} />
      <path d={`M0 21H${width}L${width + 5} 29H-5Z`} />
      <path
        d={`M6 30V43M${width - 6} 30V43`}
        stroke="#456454"
        strokeWidth="4"
      />
    </g>
  );
}

function Panel({ x, y, width, height, fill = "#e8e7d5", roof = "#547967" }) {
  return (
    <g>
      <path
        d={`M${x + 9} ${y + 9}H${x + width + 9}V${y + height + 9}H${x + 9}Z`}
        fill="#234e3e12"
      />
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx="5"
        fill={fill}
        stroke="#8c9b82"
        strokeWidth="1.5"
      />
      <path d={`M${x} ${y}H${x + width}V${y + 15}H${x}Z`} fill={roof} />
    </g>
  );
}

function RoomShell({ kind }) {
  const office = kind === "corridor";
  return (
    <g>
      <path
        d="M66 138 103 95H850L898 138V470H66Z"
        fill="#d7d2b9"
        stroke="#82917a"
        strokeWidth="2"
      />
      <path d="M103 95H850L829 123H124Z" fill="#305d4d" />
      <path d="M84 138H878V455H84Z" fill="#f6f1df" />
      <path d="M84 311H878M84 337H878" stroke="#cfcbb7" strokeWidth="2" />
      {office ? (
        <>
          {[213, 380, 546, 711].map((x) => (
            <path
              key={x}
              d={`M${x} 140V285`}
              stroke="#c3c6ae"
              strokeWidth="5"
            />
          ))}
          {[116, 281, 448, 615, 781].map((x) => (
            <Window key={x} x={x} y={145} width={60} height={32} />
          ))}
          <path d="M99 319H851" stroke="#c3ae79" strokeWidth="8" />
          <path d="M100 316H849" stroke="#fff9e6" strokeWidth="2" />
          <Bench x={216} y={383} width={130} />
          <Bench x={470} y={383} width={130} />
          <Plant x={114} y={432} scale={1.1} />
          <Plant x={665} y={432} scale={1.1} />
          <path d="M767 341V448M819 340V448" stroke="#557861" strokeWidth="4" />
        </>
      ) : (
        <>
          <path
            d="M302 138V288M601 138V288M302 343V455M601 343V455"
            stroke="#abb69e"
            strokeWidth="6"
          />
          {[145, 437, 738].map((x) => (
            <Window key={x} x={x} y={145} width={62} height={26} />
          ))}
          <Plant x={81} y={321} scale={0.7} />
          <Plant x={878} y={321} scale={0.7} />
        </>
      )}
      <path
        d="M66 470H898L875 491H85Z"
        fill="#b5bea3"
        stroke="#82917a"
        strokeWidth="1.5"
      />
    </g>
  );
}

function Architecture({ type }) {
  if (["corridor", "gallery", "arbitration"].includes(type))
    return (
      <g>
        <RoomShell kind={type} />
        {type === "gallery" && (
          <>
            <path
              d="M250 117H690L646 77H295Z"
              fill="#dfd3ad"
              stroke="#8c9b82"
              strokeWidth="2"
            />
            <path d="M291 110 470 61 652 110Z" fill="#315d4e" />
            <circle cx="470" cy="100" r="13" fill="#cbb581" />
            {[97, 860].map((x) => (
              <g key={x}>
                <path d={`M${x} 163V432`} stroke="#bdc6aa" strokeWidth="14" />
                <path
                  d={`M${x - 13} 155H${x + 13}M${x - 13} 440H${x + 13}`}
                  stroke="#8c9b82"
                  strokeWidth="8"
                />
              </g>
            ))}
          </>
        )}
        {type === "arbitration" && (
          <>
            <path
              d="M352 98 407 57H550L606 98"
              fill="#adc5b5"
              stroke="#315d4e"
              strokeWidth="3"
            />
            <path d="M414 69H546M403 82H559" stroke="#eef0d9" strokeWidth="3" />
            <path d="M455 320H509" stroke="#305d4d" strokeWidth="9" />
            <circle cx="481" cy="320" r="12" fill="#d7b266" />
            <path
              d="M481 311V329M472 320H490"
              stroke="#fff9e7"
              strokeWidth="2"
            />
          </>
        )}
      </g>
    );

  if (type === "market")
    return (
      <g>
        <path
          d="M58 169 112 100H837L900 166V466L844 491H99L58 464Z"
          fill="#e5dfc5"
          stroke="#9eac8e"
          strokeWidth="2"
        />
        <path
          d="M270 291Q477 247 688 292Q680 345 480 352Q281 350 270 291Z"
          fill="#c6d1b2"
        />
        <ellipse
          cx="478"
          cy="309"
          rx="86"
          ry="29"
          fill="#a4bdb1"
          stroke="#6c8a76"
          strokeWidth="2"
        />
        <ellipse cx="478" cy="306" rx="62" ry="17" fill="#c9dcd0" />
        <path
          d="M478 296V271M478 276Q452 260 442 281M478 276Q504 260 514 281"
          stroke="#edf2dc"
          strokeWidth="4"
          fill="none"
        />
        {[90, 286, 493].map((x, i) => (
          <g key={x}>
            <path
              d={`M${x} 182V139H${x + 132}V182`}
              fill="#ebdbb4"
              stroke="#9c8a66"
              strokeWidth="2"
            />
            <path
              d={`M${x - 13} 145 ${x + 10} 109H${x + 121}L${x + 145} 145Z`}
              fill={i === 1 ? "#ac6b52" : "#527561"}
            />
            {[0, 1, 2, 3, 4].map((j) => (
              <path
                key={j}
                d={`M${x - 13 + j * 32} 145H${x + 3 + j * 32}V155Q${x - 5 + j * 32} 162 ${x - 13 + j * 32} 155Z`}
                fill="#f7e8c8"
              />
            ))}
            <path
              d={`M${x - 3} 228H${x + 137}V240H${x - 3}Z`}
              fill="#c7a16f"
              stroke="#94734e"
              strokeWidth="1.5"
            />
          </g>
        ))}
        <Panel x={723} y={125} width={140} height={119} roof="#a56650" />
        <Panel
          x={83}
          y={354}
          width={767}
          height={104}
          fill="#efe7ce"
          roof="#b7a179"
        />
        <Plant x={99} y={306} scale={1.1} />
        <Plant x={854} y={299} scale={1.1} />
        <Person x={672} y={309} scale={0.8} color="#a2664c" />
      </g>
    );

  if (type === "house")
    return (
      <g>
        <path
          d="M58 258 122 181H416V117H844L900 173V461H62Z"
          fill="#e1d9ba"
          stroke="#939a7c"
          strokeWidth="2"
        />
        <path d="M76 264H418V139H871V453H76Z" fill="#f8f0db" />
        <path
          d="M409 202V456M606 139V456M607 304H873"
          stroke="#b4b998"
          strokeWidth="7"
        />
        <path d="M402 132 437 88H850L900 140H421Z" fill="#3a6651" />
        <path d="M54 252 108 175H399L414 195H124L76 265Z" fill="#537d63" />
        <Window x={106} y={210} width={57} height={31} />
        <Window x={284} y={209} width={57} height={31} />
        <Window x={816} y={177} width={35} height={65} />
        <Window x={815} y={347} width={35} height={65} />
        <path d="M458 419H553V444H458Z" fill="#b08b63" />
        <path d="M469 431H543" stroke="#dfcfa3" strokeWidth="3" />
        <path d="M436 222V391M454 233V381" stroke="#ddcfb0" strokeWidth="2" />
        <Plant x={84} y={424} />
        <Plant x={571} y={433} />
        <Bench x={188} y={378} width={131} />
        <path d="M61 460H899L876 480H80Z" fill="#babba0" />
      </g>
    );

  if (type === "tower")
    return (
      <g>
        <path d="M175 95H742L783 62H217Z" fill="#315c4b" />
        <path
          d="M742 95 783 62V456L742 484Z"
          fill="#9eb199"
          stroke="#7f9680"
          strokeWidth="2"
        />
        <rect
          x="175"
          y="95"
          width="567"
          height="389"
          fill="#e8e4cc"
          stroke="#738a72"
          strokeWidth="2"
        />
        {[95, 195, 295, 395].map((y, i) => (
          <g key={y}>
            <path
              d={`M179 ${y + 6}H738V${y + 87}H179Z`}
              fill={i % 2 ? "#f5f0db" : "#f2e9ce"}
            />
            <path d={`M174 ${y + 90}H744V${y + 101}H174Z`} fill="#aeb998" />
            <Window x={192} y={y + 22} width={46} height={44} />
            <Window x={680} y={y + 22} width={42} height={44} />
            <text x="151" y={y + 60} className="ms-floor-number">
              {4 - i}F
            </text>
          </g>
        ))}
        {[0, 1, 2].map((i) => (
          <path
            key={i}
            d={`M454 ${418 - i * 100}h19v-13h19v-13h19v-13h19v-13h19v-13h19`}
            fill="none"
            stroke="#9ba988"
            strokeWidth="7"
          />
        ))}
        <Plant x={115} y={466} scale={1.35} />
        <Plant x={827} y={467} scale={1.35} />
        <path d="M175 490H782" stroke="#b1b99d" strokeWidth="8" />
      </g>
    );

  if (["airport", "terminal", "station"].includes(type))
    return (
      <g>
        <path
          d="M54 160 128 109H825L904 160V305H54Z"
          fill="#d7dfc9"
          stroke="#94a88b"
          strokeWidth="2"
        />
        <path d="M75 172H882V297H75Z" fill="#f8f2dd" />
        <path
          d="M53 156 126 108H826L907 159H884L821 128H133L77 170H54Z"
          fill="#527966"
        />
        {[96, 256, 417, 578, 738].map((x) => (
          <Window key={x} x={x} y={142} width={111} height={38} />
        ))}
        <path
          d="M90 293H870V341H90Z"
          fill="#c7d7cb"
          stroke="#9bb6a4"
          strokeWidth="1.5"
        />
        <path d="M86 473H883V357H86Z" fill="#d9ddce" />
        <path d="M93 484H873M94 345H873" stroke="#a8b598" strokeWidth="4" />
        {type === "station" ? (
          <>
            <path
              d="M96 339H877M96 351H877M96 475H877M96 489H877"
              stroke="#737f70"
              strokeWidth="4"
            />
            {Array.from({ length: 23 }, (_, i) => (
              <path
                key={i}
                d={`M${109 + i * 33} 334V356M${109 + i * 33} 470V494`}
                stroke="#a89c7b"
                strokeWidth="3"
              />
            ))}
            <Bench x={89} y={389} width={89} />
            <Bench x={548} y={386} width={76} />
            <path d="M657 301H748V331H657Z" fill="#b3c8bb" />
            <path
              d="M669 305V327M691 305V327M713 305V327M735 305V327"
              stroke="#728e79"
              strokeWidth="2"
            />
          </>
        ) : (
          <>
            <path d="M403 323H552V504H403Z" fill="#b0bdb1" />
            <path
              d="M477 337V360M477 375V398M477 415V438M477 455V478"
              stroke="#f7f3d8"
              strokeWidth="5"
            />
            <g
              transform={`translate(${type === "airport" ? 150 : 609} 456) scale(.65)`}
              fill="#f8f4df"
              stroke="#607c6b"
              strokeWidth="2"
            >
              <path d="M0-58Q10-60 12-43L14-9 61 19V31L12 11 9 53 24 66V75L0 65-24 75V66L-9 53-12 11-61 31V19L-14-9-12-43Q-10-60 0-58Z" />
            </g>
            <Bench x={287} y={273} width={89} />
            <Bench x={642} y={273} width={84} />
          </>
        )}
        <Plant x={58} y={317} scale={0.8} />
        <Plant x={904} y={317} scale={0.8} />
      </g>
    );

  if (type === "embassy")
    return (
      <g>
        <path
          d="M59 192 109 112H846L903 178V475H64Z"
          fill="#d3ddbe"
          stroke="#9aaa88"
          strokeWidth="2"
        />
        <path
          d="M221 119H850V277H221Z"
          fill="#eee6ce"
          stroke="#a49e7f"
          strokeWidth="2"
        />
        <path d="M218 127 267 87H809L858 128Z" fill="#4b725b" />
        <path d="M481 85V39" stroke="#667657" strokeWidth="3" />
        <path d="M483 40 519 48 483 61Z" fill="#b36850" />
        {[245, 412, 626, 798].map((x) => (
          <Window key={x} x={x} y={140} width={34} height={61} />
        ))}
        <path d="M69 302H900M214 305V134" stroke="#b29e77" strokeWidth="8" />
        <path d="M84 312H881V456H84Z" fill="#f0e9d0" />
        <path d="M240 331H765" stroke="#b1be9a" strokeWidth="8" />
        <Plant x={456} y={302} scale={1.2} />
        <Plant x={708} y={299} scale={1.1} />
        <path
          d="M58 217H72V281H58M177 217H191V281H177"
          fill="#9fae8d"
          stroke="#6b8269"
          strokeWidth="2"
        />
        <path
          d="M72 212Q124 173 177 212"
          fill="none"
          stroke="#42674f"
          strokeWidth="9"
        />
        <path
          d="M822 337 854 315 886 337V458H822Z"
          fill="#d5c7a8"
          stroke="#9e9678"
          strokeWidth="2"
        />
        <Plant x={97} y={160} scale={0.9} />
        <Plant x={889} y={114} scale={0.8} />
      </g>
    );

  if (type === "checkpoint")
    return (
      <g>
        <path
          d="M62 119H886V485H62Z"
          fill="#edf0d9"
          stroke="#a5b092"
          strokeWidth="2"
        />
        <path
          d="M83 165H779Q864 165 864 295V322Q864 458 750 458H111"
          fill="none"
          stroke="#729184"
          strokeWidth="45"
        />
        <path
          d="M83 165H779Q864 165 864 295V322Q864 458 750 458H111"
          fill="none"
          stroke="#b8c9b9"
          strokeWidth="33"
          strokeDasharray="4 8"
        />
        {[94, 356, 683].map((x) => (
          <path
            key={x}
            d={`M${x} 249V138H${x + 80}V249`}
            fill="none"
            stroke="#4b735d"
            strokeWidth="9"
          />
        ))}
        <path
          d="M116 344H785"
          stroke="#b9c6a7"
          strokeWidth="3"
          strokeDasharray="6 10"
        />
        <path d="M254 294H663V316H254Z" fill="#dacfb0" />
        <path d="M270 279H645V292H270Z" fill="#ece5ca" />
        <Plant x={102} y={301} scale={0.85} />
        <Plant x={794} y={305} scale={0.85} />
        <Person x={698} y={295} color="#b08255" />
      </g>
    );

  if (type === "power")
    return (
      <g>
        <path
          d="M53 237 187 135H749L906 229V469H55Z"
          fill="#d7dfbf"
          stroke="#9cae88"
          strokeWidth="2"
        />
        <path d="M76 304H876V471H76Z" fill="#e6dec7" />
        <path
          d="M357 186Q371 154 364 113H442Q435 154 450 186Z"
          fill="#b9c8b1"
          stroke="#748f75"
          strokeWidth="2"
        />
        <ellipse cx="403" cy="112" rx="40" ry="10" fill="#879e88" />
        <ellipse cx="403" cy="108" rx="29" ry="5" fill="#d9e3cd" />
        <path
          d="M388 85Q369 64 395 43M414 79Q438 57 417 33"
          fill="none"
          stroke="#d6decd"
          strokeWidth="13"
          strokeLinecap="round"
        />
        <Panel
          x={470}
          y={133}
          width={238}
          height={128}
          fill="#ecdfc1"
          roof="#6d8770"
        />
        <Panel x={91} y={146} width={190} height={116} fill="#f1ead4" />
        <path d="M315 272H780V298H315Z" fill="#a6b898" />
        <path d="M314 277H780" stroke="#d7e1c1" strokeWidth="4" />
        <path
          d="M781 263 814 99 849 263M797 190H834M803 157H827M809 124H820"
          fill="none"
          stroke="#678368"
          strokeWidth="4"
        />
        <path d="M794 153H697M827 126H702" stroke="#6e8b72" strokeWidth="2" />
        <path
          d="M598 484V352H796V484"
          fill="#c4c8b0"
          stroke="#83967c"
          strokeWidth="3"
        />
        <path d="M615 484V363H780V484" fill="#e0ddc7" />
        <path
          d="M320 344V460H485M336 360V460M353 377V460M370 394V460M387 411V460M404 428V460"
          fill="none"
          stroke="#a4a78b"
          strokeWidth="4"
        />
        <Plant x={849} y={457} scale={1.1} />
      </g>
    );

  if (type === "assembly")
    return (
      <g>
        <Panel x={75} y={126} width={392} height={147} fill="#eee5cb" />
        <path d="M272 147V258" stroke="#a6b094" strokeWidth="6" />
        <path
          d="M514 173Q679 56 860 176V441H514Z"
          fill="#d5ddc2"
          stroke="#8aa080"
          strokeWidth="2"
        />
        <path
          d="M527 177Q682 77 847 177"
          fill="none"
          stroke="#456e57"
          strokeWidth="14"
        />
        <ellipse
          cx="689"
          cy="333"
          rx="142"
          ry="96"
          fill="#eee8cf"
          stroke="#9fac8e"
          strokeWidth="2"
        />
        <ellipse
          cx="689"
          cy="333"
          rx="108"
          ry="72"
          fill="none"
          stroke="#b3bf9f"
          strokeWidth="13"
          strokeDasharray="12 9"
        />
        <path d="M74 360H488V466H74Z" fill="#b4cabc" />
        <path
          d="M83 372Q230 343 478 372M83 448Q277 475 478 448"
          stroke="#d9e6cc"
          strokeWidth="3"
          fill="none"
        />
        <path
          d="M102 388H502L486 445H111Z"
          fill="#c5a774"
          stroke="#9e8257"
          strokeWidth="2"
        />
        <path d="M111 397H491M117 423H484" stroke="#ecdbb3" strokeWidth="3" />
        <path
          d="M96 387V438M162 383V438M337 382V437M419 382V438M498 384V438"
          stroke="#5e7960"
          strokeWidth="4"
        />
        <Plant x={90} y={318} scale={1.1} />
        <Plant x={864} y={451} scale={1.1} />
      </g>
    );

  if (type === "registry")
    return (
      <g>
        <path
          d="M208 120H852L903 173V466H211Z"
          fill="#e9dfc5"
          stroke="#a29576"
          strokeWidth="2"
        />
        <path
          d="M207 129 262 78H822L901 133H856L813 108H271L232 151Z"
          fill="#a76650"
        />
        <path d="M235 157H873V448H235Z" fill="#f5edd8" />
        <path
          d="M239 297H869M510 157V275M510 330V449"
          stroke="#cabca0"
          strokeWidth="5"
        />
        {[275, 555, 803].map((x) => (
          <Window key={x} x={x} y={151} width={48} height={28} />
        ))}
        <path
          d="M66 464V230Q68 162 132 161Q198 162 202 230V464"
          fill="#e4dbc2"
          stroke="#aa9d7f"
          strokeWidth="2"
        />
        <path
          d="M84 464V235Q88 182 132 182Q179 182 182 235V464"
          fill="#d5dfbe"
        />
        <path
          d="M60 235Q66 150 132 150Q198 150 208 235"
          fill="none"
          stroke="#ae6c53"
          strokeWidth="13"
        />
        <circle cx="491" cy="100" r="18" fill="#ddc69b" />
        <path
          d="M480 100Q480 89 490 96Q504 88 503 100L491 111Z"
          fill="#a9614c"
        />
        <Plant x={57} y={414} scale={1.25} />
        <Plant x={211} y={430} scale={1.15} />
        <Bench x={551} y={281} width={135} />
      </g>
    );

  if (type === "enforcement")
    return (
      <g>
        <path
          d="M57 129H897V477H58Z"
          fill="#d5dfbf"
          stroke="#9cad8e"
          strokeWidth="2"
        />
        <Panel
          x={83}
          y={129}
          width={777}
          height={130}
          fill="#eee6cb"
          roof="#456c56"
        />
        <path d="M266 145V251M551 145V251" stroke="#aab596" strokeWidth="6" />
        <path
          d="M159 286H758V354H575V450H156V379H485V330H159Z"
          fill="#e9dfc3"
          stroke="#c2ba9d"
          strokeWidth="1.5"
        />
        <path
          d="M578 351H861V461H578Z"
          fill="#f4ead0"
          stroke="#a4ae8e"
          strokeWidth="2"
        />
        <path d="M689 352V460" stroke="#a5b090" strokeWidth="5" />
        <path d="M84 364H444V478H84Z" fill="#a9c8bc" />
        <path
          d="M87 397Q217 379 443 397M87 439Q273 459 443 439"
          fill="none"
          stroke="#d4e5cc"
          strokeWidth="3"
        />
        <path
          d="M221 354H284V461H221Z"
          fill="#c49e69"
          stroke="#927649"
          strokeWidth="2"
        />
        {[365, 381, 397, 413, 429, 445].map((y) => (
          <path key={y} d={`M224 ${y}H282`} stroke="#eed9af" strokeWidth="2" />
        ))}
        <Plant x={103} y={311} scale={1.1} />
        <Plant x={853} y={301} scale={1.1} />
        <Bench x={375} y={295} width={72} />
      </g>
    );

  return <RoomShell kind="gallery" />;
}

function Prop({ kind, hidden }) {
  const word = (value, x = 0, y = 8, size = 16) =>
    hidden ? null : (
      <text
        x={x}
        y={y}
        textAnchor="middle"
        fontSize={size}
        className="ms-object-text"
      >
        {value}
      </text>
    );
  const paper = (fill = "#fff9e8") => (
    <>
      <path d="M-27-34H17L28-23V30H-27Z" fill={fill} />
      <path d="M17-34V-23H28M-17-13H14M-17-3H14M-17 8H3" fill="none" />
      <path d="M-17 20H5" stroke="#ab6550" strokeWidth="3" />
    </>
  );
  const coin = (x, y, r = 13) => (
    <g>
      <circle cx={x} cy={y} r={r} fill="#d6b365" />
      <circle cx={x} cy={y} r={r - 4} fill="none" stroke="#f8e7b5" />
      {word("¥", x, y + 4, 12)}
    </g>
  );
  const clock = (number) => (
    <>
      <path d="M-19-32-24-39M19-32 24-39M-20 28-27 38M20 28 27 38" />
      <circle r="32" fill="#fbf2d7" />
      <circle r="25" fill="none" stroke="#c6b789" />
      <path d="M0-19V0L14 10" fill="none" stroke="#b1654b" strokeWidth="3" />
      <circle r="3" fill="#315f4d" />
      {word(number, 0, 24, 11)}
    </>
  );
  const safe = (
    <>
      <rect x="-34" y="-32" width="68" height="65" rx="5" fill="#839a85" />
      <rect x="-26" y="-24" width="51" height="48" rx="3" fill="#bac7a5" />
      <circle cx="3" cy="-1" r="13" fill="#e1cc92" />
      <path d="M3-15V13M-11-1H17" />
      <path d="M-23-12V8" strokeWidth="4" />
    </>
  );
  const gavel = (
    <>
      <path d="M-17 28H32V35H-17Z" fill="#a7895d" />
      <g transform="rotate(-35)">
        <rect x="-7" y="-8" width="14" height="48" rx="3" fill="#b88959" />
        <rect x="-25" y="-26" width="50" height="23" rx="4" fill="#866445" />
        <path d="M-17-26V-3M17-26V-3" stroke="#dcc499" strokeWidth="4" />
      </g>
    </>
  );
  const people = (
    <>
      {[-22, 0, 22].map((x, i) => (
        <Person
          key={x}
          x={x}
          y={i === 1 ? -10 : -3}
          scale={0.9}
          color={i === 1 ? "#af7552" : "#466d59"}
        />
      ))}
    </>
  );
  const screen = (
    <>
      <rect x="-38" y="-31" width="76" height="49" rx="4" fill="#416756" />
      <rect x="-31" y="-24" width="62" height="34" fill="#b8cfc0" />
      <path d="M0 18V33M-18 34H18" strokeWidth="4" />
      <path d="M-24-13H0M-24-4H7M-24 4H-7" fill="none" stroke="#557a62" />
    </>
  );
  const lock = (x = 0, y = 0, scale = 1) => (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M-12-3V-18A12 12 0 0 1 12-18V-3" fill="none" strokeWidth="5" />
      <rect x="-20" y="-6" width="40" height="32" rx="4" fill="#d5b068" />
      <circle cy="7" r="4" fill="#476652" />
      <path d="M0 9V17" />
    </g>
  );
  const cut = (
    <>
      <circle cx="-17" cy="21" r="10" fill="#c19765" />
      <circle cx="17" cy="21" r="10" fill="#c19765" />
      <path d="M-13 13 22-32M13 13-22-32" stroke="#597866" strokeWidth="6" />
      <circle cy="-1" r="4" fill="#e3cf98" />
    </>
  );

  return (
    <g
      className="ms-prop"
      fill="none"
      stroke="#42634e"
      strokeWidth="2"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <ellipse cx="2" cy="37" rx="38" ry="7" fill="#274b3b15" stroke="none" />
      {kind === "ledger" && (
        <>
          <path
            d="M0-28Q-19-38-37-28V28Q-18 20 0 31Q18 20 37 28V-28Q19-38 0-28Z"
            fill="#faf2d7"
          />
          <path
            d="M0-28V31M-27-15H-8M-27-4H-8M-27 7H-8M10-15H28M10-4H28"
            fill="none"
          />
          <circle
            cx="19"
            cy="14"
            r="10"
            stroke="#a9614b"
            fill="none"
            strokeWidth="3"
          />
        </>
      )}
      {kind === "letter" && (
        <>
          <path d="M-39-22H39V27H-39Z" fill="#e8d7a6" />
          <path d="M-39-22 0 7 39-22M-39 27-14 0M39 27 14 0" fill="none" />
          <rect x="16" y="-17" width="14" height="15" fill="#b86b50" />
          <path d="M-19 17H9" stroke="#8c926f" />
        </>
      )}
      {kind === "calendar60" && (
        <>
          <rect x="-31" y="-32" width="62" height="66" rx="3" fill="#fff7df" />
          <path d="M-31-32H31V-15H-31Z" fill="#aa634e" />
          <path d="M-15-38V-24M15-38V-24" stroke="#e3d4a9" strokeWidth="4" />
          {word("60", 0, 17, 27)}
          <path d="M-20 25H19" stroke="#c3b58e" />
        </>
      )}
      {["board", "table", "closed-meeting", "panel", "assembly"].includes(
        kind,
      ) && (
        <>
          <ellipse cy="5" rx="40" ry="22" fill="#c7ac74" />
          <path d="M-27 15V34M27 15V34" strokeWidth="4" />
          {[-23, 0, 23].map((x) => (
            <g key={x}>
              <circle cx={x} cy="-21" r="7" fill="#d9b584" />
              <path
                d={`M${x - 9}-8Q${x}-20 ${x + 9}-8V-1H${x - 9}Z`}
                fill="#49735b"
              />
            </g>
          ))}
          {kind === "closed-meeting" ? (
            lock(28, 19, 0.65)
          ) : (
            <path d="M-14-1 5-3 18 8-2 12Z" fill="#fff5d9" />
          )}
        </>
      )}
      {kind === "notice" && (
        <>
          <path d="M-32-31H32V15H-32Z" fill="#f3e9c8" />
          <path d="M-29-16H24M-29-5H13" />
          <path d="M-23 15-32 29-16 24-8 35 3 17" fill="#c19169" />
          <path d="M-34-35H36M-22 18V37M23 18V37" strokeWidth="4" />
        </>
      )}
      {["exit", "fork"].includes(kind) && (
        <>
          <path d="M0-32V38" strokeWidth="6" />
          <path d="M-1-28H35L45-17 35-6H-1Z" fill="#ccae71" />
          <path d="M1 1H-34L-46 13-34 25H1Z" fill="#90ad92" />
          <path
            d="M10-17H30M-8 13H-30"
            fill="none"
            stroke="#f8f1d8"
            strokeWidth="3"
          />
        </>
      )}
      {["half", "thirds", "quarters"].includes(kind) && (
        <>
          <ellipse cy="30" rx="39" ry="9" fill="#a98d5e" />
          <path d="M-33 5V30M33 5V30" strokeWidth="4" />
          <circle r="33" fill="#f3e6c1" />
          {kind === "half" && (
            <path d="M0-33A33 33 0 0 1 0 33Z" fill="#638773" />
          )}
          {kind === "thirds" && (
            <>
              <path d="M0 0V-33A33 33 0 1 1-28.6 16.5Z" fill="#648b75" />
              <path
                d="M0 0 28.6 16.5M0 0-28.6 16.5"
                fill="none"
                stroke="#f6edcf"
                strokeWidth="3"
              />
            </>
          )}
          {kind === "quarters" && (
            <>
              <path d="M0 0V-33A33 33 0 1 1-33 0Z" fill="#648b75" />
              <path d="M0-33V33M0 0H33" stroke="#f6edcf" strokeWidth="3" />
            </>
          )}
        </>
      )}
      {["gate", "gate10", "security", "no-exit"].includes(kind) && (
        <>
          <path d="M-35 34V-34H35V34H23V-22H-23V34Z" fill="#90aa90" />
          <path d="M-43 35H-16M17 35H43" strokeWidth="5" />
          {kind === "no-exit" ? (
            <path
              d="M-21-15 21 26M21-15-21 26"
              stroke="#b5634b"
              strokeWidth="7"
            />
          ) : (
            <>
              <path d="M-18 9H19" stroke="#b9a271" strokeWidth="7" />
              <circle cx="29" cy="-28" r="3" fill="#b76f51" />
              {word(kind === "gate10" ? "10" : "✓", 0, 3, 16)}
            </>
          )}
        </>
      )}
      {["ticket300", "ticket", "price", "receipt"].includes(kind) && (
        <>
          <path
            d="M-34-29H34V-7Q24 0 34 7V30H-34V7Q-24 0-34-7Z"
            fill="#f2dba5"
          />
          <path d="M-16-24V25" stroke="#bfa570" strokeDasharray="2 5" />
          {word(
            kind === "ticket300" ? "300" : kind === "price" ? "¥" : "✓",
            7,
            8,
            18,
          )}
          <path d="M-7 18H24" stroke="#b99663" />
        </>
      )}
      {kind === "cash" && (
        <>
          <path d="M-39 5H40V34H-39Z" fill="#7a9680" />
          <path d="M-25-30H27L36 4H-33Z" fill="#abc1a6" />
          <rect x="-14" y="-23" width="30" height="14" fill="#395f4c" />
          <path d="M-20 16H-5M8 16H24" stroke="#e7d6a6" strokeWidth="4" />
          <path d="M0 6V33" />
          {coin(30, 22, 11)}
        </>
      )}
      {kind === "switch" && (
        <>
          <rect x="-30" y="-32" width="60" height="64" rx="4" fill="#65846d" />
          <path d="M-13-4H13V24H-13Z" fill="#e6ce8a" />
          <path d="M0 13 18-8" stroke="#b2634b" strokeWidth="9" />
          {[-18, 0, 18].map((x) => (
            <circle key={x} cx={x} cy="-22" r="5" fill="#bc644e" />
          ))}
        </>
      )}
      {kind === "association" && (
        <>
          <circle r="13" fill="#cda66a" />
          {[-31, 31].map((x) => (
            <g key={x}>
              <path d={`M${x < 0 ? -13 : 13} 0H${x}`} />
              <circle cx={x} r="9" fill="#91af96" />
            </g>
          ))}
          <path d="M0 13V32" />
          <circle cy="32" r="9" fill="#91af96" />
          <path d="M0-13V-32" />
          <circle cy="-32" r="9" fill="#91af96" />
        </>
      )}
      {["black-paper", "gray-paper", "will"].includes(kind) && (
        <>
          {paper(
            kind === "black-paper"
              ? "#617163"
              : kind === "gray-paper"
                ? "#bdc0a8"
                : "#fff6db",
          )}
          {kind !== "will" && (
            <path
              d="M-19-10H13M-19 0H13"
              stroke={kind === "black-paper" ? "#253e32" : "#7c8975"}
              strokeWidth="6"
            />
          )}
        </>
      )}
      {kind === "hourglass" && (
        <>
          <path d="M-24-33H24M-24 34H24" strokeWidth="6" />
          <path
            d="M-21-30Q-24-11-3 0Q-24 12-21 31H21Q24 12 3 0Q24-11 21-30Z"
            fill="#eef0d2"
          />
          <path
            d="M-15-19H15L0-3Z M-16 27 0 11 16 27Z"
            fill="#ceab66"
            stroke="none"
          />
          {word("30", 0, -20, 11)}
        </>
      )}
      {kind === "safe" && safe}
      {["clock2", "clock3", "clock12"].includes(kind) && clock(kind.slice(5))}
      {kind === "fast" && (
        <>
          <path d="M-40-18H22L38 0 22 18H-40L-22 0Z" fill="#b46c51" />
          <path
            d="M-13-10 0 0-13 10M4-10 17 0 4 10"
            fill="none"
            stroke="#fff0ce"
            strokeWidth="5"
          />
          <path d="M-36 27H31M-30 35H20" stroke="#9bad91" strokeWidth="3" />
        </>
      )}
      {["crowd", "people"].includes(kind) && people}
      {kind === "return" && (
        <>
          <path
            d="M-24 23A34 34 0 1 0-23-24"
            stroke="#5e8c70"
            strokeWidth="9"
            fill="none"
          />
          <path d="M-37-28-21-6-12-32Z" fill="#5e8c70" stroke="none" />
          {word("6", 2, 10, 25)}
        </>
      )}
      {kind === "train" && (
        <>
          <rect x="-32" y="-32" width="64" height="61" rx="16" fill="#93b19b" />
          <path d="M-25-19H25V1H-25Z" fill="#dce7cd" />
          <path d="M0-19V1M-20 31-28 39M20 31 28 39" />
          <circle cx="-18" cy="17" r="5" fill="#e6c67e" />
          <circle cx="18" cy="17" r="5" fill="#e6c67e" />
          <path d="M-11-28H11" stroke="#416551" strokeWidth="4" />
        </>
      )}
      {kind === "art" && (
        <>
          <rect x="-38" y="-29" width="46" height="58" fill="#c7a568" />
          <rect x="-31" y="-22" width="32" height="44" fill="#e9ecd0" />
          <path d="M-29 19-16-5-1 19Z" fill="#7f9b7b" />
          <circle cx="-8" cy="-13" r="5" fill="#c69960" />
          <path d="M13 30H40V36H13Z" fill="#a0b299" />
          <path
            d="M21 28Q7 12 25-1Q14-18 29-27Q46-18 32-1Q46 10 36 28Z"
            fill="#b3c4a7"
          />
        </>
      )}
      {kind === "film" && (
        <>
          <rect x="-35" y="-19" width="70" height="53" rx="3" fill="#738d76" />
          <path d="M-35-32 30-44 35-25-35-13Z" fill="#d4c693" />
          <path
            d="M-23-32-13-20M-1-36 9-24M19-40 29-28"
            stroke="#456a53"
            strokeWidth="8"
          />
          <path d="M-8-4 13 8-8 21Z" fill="#f1dfad" />
        </>
      )}
      {["machine", "generator"].includes(kind) && (
        <>
          <rect x="-39" y="-17" width="78" height="48" rx="8" fill="#84a088" />
          <circle cx="7" cy="7" r="22" fill="#bccdae" />
          <circle cx="7" cy="7" r="11" fill="#d5b476" />
          <path d="M-27-16V-32H-8V-16M-42 34H41" strokeWidth="5" />
          <path d="M7-15V-9M29 7H23M7 29V23M-15 7H-9" strokeWidth="3" />
          {kind === "generator" && (
            <path d="M32-43 18-24H29L19-7 42-31H30Z" fill="#d3aa58" />
          )}
        </>
      )}
      {kind === "keys" && (
        <>
          {[-26, 0, 26].map((x, i) => (
            <g key={x} transform={`translate(${x} ${i === 1 ? -9 : 0})`}>
              <circle cy="-13" r="11" fill={i === 1 ? "#b8865b" : "#caaa6e"} />
              <circle cy="-13" r="4" fill="#faf1d7" />
              <path
                d="M0-2V30H10V22H0M0 13H8"
                fill="none"
                stroke={i === 1 ? "#b8865b" : "#caaa6e"}
                strokeWidth="7"
              />
            </g>
          ))}
        </>
      )}
      {kind === "stamp" && (
        <>
          {paper()}
          <g transform="translate(19 11) rotate(15)">
            <path d="M-19 12H19V22H-19Z" fill="#b2684e" />
            <path d="M-9 12V-7Q-17-27 0-29Q17-27 9-7V12Z" fill="#92744d" />
          </g>
        </>
      )}
      {["control", "screen"].includes(kind) && (
        <>
          {screen}
          {kind === "control" && (
            <>
              {[-20, 0, 20].map((x) => (
                <circle key={x} cx={x} cy="-7" r="5" fill="#b8664d" />
              ))}
            </>
          )}
        </>
      )}
      {["court", "locked-court"].includes(kind) && (
        <>
          <path d="M-41-13 0-38 41-13Z" fill="#d1b778" />
          <path d="M-38 30H38V38H-38Z" fill="#98ac91" />
          {[-25, 0, 25].map((x) => (
            <path key={x} d={`M${x}-10V28`} stroke="#829d82" strokeWidth="12" />
          ))}
          {kind === "locked-court" ? (
            lock(16, 15, 0.75)
          ) : (
            <path
              d="M-3 5 5 13 22-5"
              fill="none"
              stroke="#b3694b"
              strokeWidth="5"
            />
          )}
        </>
      )}
      {kind === "war" && (
        <>
          <path d="M-36 18H25L37 31H-38Z" fill="#8a9b7b" />
          <path d="M-11-15H18L23 18H-17Z" fill="#aeb99a" />
          <path d="M10-7 43-24" stroke="#526e50" strokeWidth="10" />
          <circle cx="-19" cy="27" r="9" fill="#648266" />
          <circle cx="20" cy="27" r="9" fill="#648266" />
          <path d="M-22-28-31-41M-9-30-8-44" stroke="#b86a4d" strokeWidth="4" />
        </>
      )}
      {kind === "plane" && (
        <>
          <path
            d="M0-42Q9-42 9-27L11-5 39 12V22L9 11 6 31 18 38V44L0 36-18 44V38L-6 31-9 11-39 22V12L-11-5-9-27Q-9-42 0-42Z"
            fill="#e6e9ce"
          />
          <path d="M-4-25H4" stroke="#a3664e" strokeWidth="5" />
        </>
      )}
      {kind === "badge" && (
        <>
          <path d="M-27-33H27V4Q27 25 0 36Q-27 25-27 4Z" fill="#caae71" />
          <path
            d="M0-18 6-6 20-4 10 5 13 20 0 13-13 20-10 5-20-4-6-6Z"
            fill="#f8ebc3"
          />
          <path d="M-37 25 36-28" stroke="#b5674e" strokeWidth="7" />
        </>
      )}
      {kind === "guard" && (
        <>
          <Person x={0} y={-2} scale={1.35} />
          <path d="M-14-27H14L10-38H-10Z" fill="#385c46" />
          <path d="M-17-27H17" strokeWidth="4" />
          <path d="M30-30V33" strokeWidth="5" />
        </>
      )}
      {kind === "passport" && (
        <>
          <rect x="-29" y="-36" width="58" height="73" rx="4" fill="#5f8168" />
          <circle cy="-6" r="17" fill="none" stroke="#e2ca8b" />
          <ellipse cy="-6" rx="8" ry="17" fill="none" stroke="#e2ca8b" />
          <path d="M-17-6H17M-15-14H15M-15 2H15M-13 24H13" stroke="#e2ca8b" />
        </>
      )}
      {["house", "shop"].includes(kind) && (
        <>
          <path d="M-30-8H30V34H-30Z" fill="#dfd4ad" />
          <path
            d="M-39-10 0-38 39-10Z"
            fill={kind === "shop" ? "#ad6e50" : "#5c8167"}
          />
          <path d="M7 4H23V17H7M-21 5H-4V34H-21Z" fill="#a7c3ac" />
          {kind === "shop" && (
            <path
              d="M-33-7H34V2Q28 10 20 2Q12 10 4 2Q-4 10-12 2Q-22 10-33 2Z"
              fill="#e7c18b"
            />
          )}
        </>
      )}
      {kind === "gavel" && gavel}
      {kind === "helmet" && (
        <>
          <path d="M-33 6Q-35-28 0-33Q35-28 33 6Z" fill="#d6b262" />
          <path d="M-42 6H42V17H-42Z" fill="#dec688" />
          <path d="M-6-33V5H6V-33M-23-23V4M23-23V4" fill="none" />
          <path d="M-27 17Q0 35 27 17" stroke="#7b9272" fill="none" />
        </>
      )}
      {kind === "food" && (
        <>
          <path d="M-35 6H35L24 31H-24Z" fill="#d8bc7d" />
          <path
            d="M-26 6Q-36-19-15-24Q0-24 2-9Q4-35 25-25Q42-18 28 6Z"
            fill="#7e9c6c"
          />
          <path d="M-17-26-15-37M17-26 23-38" strokeWidth="3" />
          <circle cx="12" cy="3" r="16" fill="#b77550" />
          <path d="M12-9V-18" />
        </>
      )}
      {kind === "water" && (
        <>
          <path
            d="M0-38Q35 6 29 21Q23 38 0 38Q-25 36-29 19Q-34 4 0-38Z"
            fill="#8db5a9"
          />
          <path
            d="M-15 5Q-22 19-10 25"
            fill="none"
            stroke="#e9efcc"
            strokeWidth="5"
          />
          <path
            d="M-40 28Q-27 18-14 28Q0 38 14 28Q27 18 40 28"
            fill="none"
            stroke="#608b79"
            strokeWidth="4"
          />
        </>
      )}
      {["vault", "currency"].includes(kind) && (
        <>
          {safe}
          {coin(26, 28, 15)}
          {kind === "currency" && (
            <>
              <path
                d="M-16-36V31M0-36V31M16-36V31"
                stroke="#42634e"
                strokeWidth="4"
              />
            </>
          )}
        </>
      )}
      {kind === "scissors" && cut}
      {kind === "shelter" && (
        <>
          <path d="M-42 34V3Q-39-31 0-34Q38-31 42 3V34Z" fill="#9bb095" />
          <path d="M-21 34V6Q-20-9 0-10Q21-9 22 6V34Z" fill="#486b55" />
          <path d="M-6-31-18-45M13-33 24-48" stroke="#b76c50" strokeWidth="4" />
          <path d="M-27 20H-36M29 17H38M-35-2H-26" stroke="#d3dcbf" />
        </>
      )}
      {kind === "stairs" && (
        <>
          <path
            d="M-38 32H-19V13H0V-6H19V-25H38"
            fill="none"
            stroke="#809d80"
            strokeWidth="14"
          />
          <path
            d="M-34 9 23-46M11-45H27V-29"
            stroke="#bd9c60"
            strokeWidth="4"
            fill="none"
          />
        </>
      )}
      {kind === "vote" && (
        <>
          <path d="M-30-9H30L37 2V33H-37V2Z" fill="#9bb69a" />
          <path d="M-18-2H19" strokeWidth="4" />
          <path d="M-14-38H13V-3H-14Z" fill="#f9edca" />
          <path
            d="M-8-24-1-17 8-30"
            stroke="#a45f48"
            strokeWidth="3"
            fill="none"
          />
        </>
      )}
      {kind === "bridge" && (
        <>
          <path
            d="M-40 27Q0-10 40 27M-40 3Q0-34 40 3"
            fill="none"
            stroke="#997b51"
            strokeWidth="5"
          />
          {[-38, -20, 0, 20, 38].map((x) => (
            <path
              key={x}
              d={`M${x} ${Math.abs(x) * 0.58 - 14}V${Math.abs(x) * 0.58 + 11}`}
              strokeWidth="3"
            />
          ))}
          <path
            d="M-43 35Q-23 25-4 35Q17 45 40 35"
            fill="none"
            stroke="#8bad9b"
            strokeWidth="3"
          />
        </>
      )}
      {kind === "ruler" && (
        <>
          <path d="M-15-41H10V37H-15Z" fill="#d8bb7b" />
          {[-29, -16, -3, 10, 23].map((y) => (
            <path key={y} d={`M-14 ${y}H${y % 2 ? -2 : 5}`} />
          ))}
          <Person x={24} y={4} scale={1.1} />
        </>
      )}
      {kind === "family" && (
        <>
          <path
            d="M0-26V-6M-28 11V-6H28V11M0-6V23"
            fill="none"
            stroke="#799578"
            strokeWidth="4"
          />
          {[
            [0, -32],
            [-28, 16],
            [28, 16],
            [0, 29],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="10" fill="#dcc08d" />
          ))}
          <path
            d="M-21 34 22-24"
            stroke="#b47154"
            strokeWidth="3"
            strokeDasharray="5 4"
          />
        </>
      )}
      {kind === "rings" && (
        <>
          <circle
            cx="-14"
            cy="2"
            r="23"
            fill="none"
            stroke="#c7a052"
            strokeWidth="9"
          />
          <circle
            cx="16"
            cy="2"
            r="23"
            fill="none"
            stroke="#dbc081"
            strokeWidth="9"
          />
          <path
            d="M1-32V-43M-20-28-28-37M23-29 31-38"
            stroke="#b3664d"
            strokeWidth="4"
          />
        </>
      )}
      {kind === "archive" && (
        <>
          <rect x="-31" y="-35" width="62" height="73" rx="3" fill="#9db192" />
          {[-27, -5, 17].map((y) => (
            <g key={y}>
              <rect
                x="-24"
                y={y}
                width="48"
                height="17"
                rx="2"
                fill="#dbd7b7"
              />
              <path d={`M-6 ${y + 8}H6`} strokeWidth="3" />
            </g>
          ))}
        </>
      )}
      {kind === "runways" && (
        <>
          <path d="M-36-36H-5V37H-36ZM7-36H38V37H7Z" fill="#819b86" />
          <path
            d="M-21-30V30M23-30V30"
            stroke="#f6ebc6"
            strokeWidth="3"
            strokeDasharray="9 8"
          />
        </>
      )}
      {kind === "pause" && (
        <>
          <rect x="-31" y="-32" width="62" height="64" rx="6" fill="#a5b99b" />
          <path d="M-13-19V20M13-19V20" stroke="#f6edcf" strokeWidth="12" />
        </>
      )}
      {kind === "locks" && (
        <>
          {[
            [-24, -19],
            [24, -19],
            [0, 18],
            [-37, 29],
            [37, 29],
          ].map(([x, y]) => (
            <g key={`${x}-${y}`}>{lock(x, y, 0.62)}</g>
          ))}
        </>
      )}
      {kind === "luggage" && (
        <>
          <path d="M-13-31V-39H13V-31" fill="none" strokeWidth="4" />
          <rect x="-30" y="-29" width="60" height="59" rx="8" fill="#c7a16b" />
          <path d="M-16-28V30M16-28V30" stroke="#edce91" strokeWidth="5" />
          <path d="M-20 32V39M20 32V39" strokeWidth="5" />
          <path d="M17-18H39V1H17Z" fill="#ebedd0" />
        </>
      )}
      {kind === "chairs" && (
        <>
          {[-28, 0, 28].map((x, i) => (
            <g key={x} transform={`translate(${x} ${i === 1 ? -12 : 0})`}>
              <path
                d="M-10-25H10V8H-10Z"
                fill={i === 1 ? "#be9664" : "#82a185"}
              />
              <path d="M-14 8H14V17H-14Z" fill="#e1c98f" />
              <path d="M-10 17V32M10 17V32" strokeWidth="3" />
            </g>
          ))}
        </>
      )}
      {kind === "parcel" && (
        <>
          <path d="M-36-17 0-34 36-17V23L0 40-36 23Z" fill="#c7a576" />
          <path d="M-36-17 0 0 36-17M0 0V40" fill="none" />
          <path d="M-15-27 22-9V4L7 10V-2L-28-21" fill="#e9d5a0" />
          {word("EMS", 16, 17, 10)}
        </>
      )}
      {kind === "microscope" && (
        <>
          <path d="M-32 34H34V40H-32Z" fill="#94ae92" />
          <path
            d="M10-18Q41-18 31 13Q23 31-1 29"
            fill="none"
            stroke="#789a7c"
            strokeWidth="11"
          />
          <g transform="rotate(30)">
            <path d="M-12-38H5V-2H-12Z" fill="#c7af76" />
            <path d="M-14-39H8M-13-1H7" strokeWidth="5" />
          </g>
          <path d="M-28 17H18M-17 18V33" strokeWidth="5" />
        </>
      )}
      {kind === "window" && (
        <>
          <rect x="-38" y="-35" width="76" height="67" rx="3" fill="#a7bfa5" />
          <path d="M-30-27H30V17H-30Z" fill="#eff0d4" />
          <Person x={2} y={0} scale={0.8} />
          <path d="M-44 22H44V32H-44Z" fill="#c6a66f" />
          <path d="M-28 16H-4V22H-28Z" fill="#fff3d3" />
        </>
      )}
      {kind === "partition" && (
        <>
          <path d="M-33-17 0-38 34-17V32H-33Z" fill="#d3c398" />
          <path
            d="M-40-16 0-43 41-16"
            fill="none"
            stroke="#64836a"
            strokeWidth="6"
          />
          <path
            d="M0-24V33"
            stroke="#a5654d"
            strokeWidth="3"
            strokeDasharray="5 5"
          />
          <path d="M-22-7H-8V8H-22ZM10 12H25V32H10Z" fill="#9eba9f" />
        </>
      )}
      {kind === "boat" && (
        <>
          <path d="M-42 11H40L24 31H-25Z" fill="#b78f5e" />
          <path d="M-7-34V12M-6-33 30 1H-6Z" fill="#f0e5c0" />
          <path
            d="M-42 37Q-28 29-14 37Q0 45 14 37Q28 29 42 37"
            fill="none"
            stroke="#86ac97"
            strokeWidth="4"
          />
          <path d="M-29 10V-8H-13V10" fill="#c9b785" />
        </>
      )}
    </g>
  );
}

function routePath(points) {
  return points.map(([x, y], i) => `${i ? "L" : "M"}${x},${y + 49}`).join(" ");
}

export function MemoryScenePreview({ palace }) {
  const scene = SCENES[palace.id];
  return (
    <svg
      className="memory-scene-preview"
      viewBox="35 45 890 460"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="35" y="45" width="890" height="460" fill="#f6f0dc" />
      <Architecture type={scene?.type || "gallery"} />
      {scene && (
        <>
          <path
            d={routePath(scene.points)}
            fill="none"
            stroke="#ad7856"
            strokeWidth="5"
            strokeDasharray="8 11"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity=".7"
          />
          {scene.points.map(([x, y], index) => (
            <g key={index} transform={`translate(${x} ${y}) scale(.85)`}>
              <Prop kind={scene.props[index]} hidden />
            </g>
          ))}
        </>
      )}
    </svg>
  );
}

export default function MemoryScene({
  palace,
  activeIndex,
  onSelect,
  concealLabels = false,
  showNavigation = true,
  interactive = true,
}) {
  const prefix = useId().replaceAll(":", "");
  const [zoom, setZoom] = useState(false);
  const scene = SCENES[palace.id];
  // All current palaces have a hand-drawn scene; keep future content selectable.
  const points =
    scene?.points ||
    palace.stations.map((_, i) => [
      145 + (i % 3) * 288,
      211 + Math.floor(i / 3) * 170,
    ]);
  const active = points[activeIndex] || points[0];
  const viewBox = zoom
    ? `${Math.max(0, Math.min(960 - 560, active[0] - 280))} ${Math.max(0, Math.min(550 - 350, active[1] - 175))} 560 350`
    : "0 0 960 550";
  const selectByKeyboard = (event, index) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(index);
    } else if (
      ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(event.key)
    ) {
      event.preventDefault();
      const direction = ["ArrowRight", "ArrowDown"].includes(event.key)
        ? 1
        : -1;
      const next =
        (index + direction + palace.stations.length) % palace.stations.length;
      onSelect(next);
      event.currentTarget.parentElement
        .querySelector(`[data-station-index="${next}"]`)
        ?.focus();
    }
  };

  return (
    <figure
      className={`memory-scene memory-scene--${scene?.type || "gallery"}${interactive ? "" : " memory-scene--static"}`}
    >
      <div className="memory-scene-heading">
        <div>
          <span className="memory-scene-eyebrow">空间路线</span>
          <strong>{scene?.name || palace.title}</strong>
        </div>
        <div className="memory-scene-view" aria-label="场景缩放">
          <button
            type="button"
            className={!zoom ? "active" : ""}
            aria-pressed={!zoom}
            onClick={() => setZoom(false)}
          >
            <svg viewBox="0 0 18 18" aria-hidden="true">
              <path d="M6 2H2V6M12 2H16V6M16 12V16H12M6 16H2V12" />
            </svg>
            总览
          </button>
          <button
            type="button"
            className={zoom ? "active" : ""}
            aria-pressed={zoom}
            onClick={() => setZoom(true)}
          >
            <svg viewBox="0 0 18 18" aria-hidden="true">
              <circle cx="7.5" cy="7.5" r="5" />
              <path d="M11 11 16 16M5 7.5H10M7.5 5V10" />
            </svg>
            近看
          </button>
        </div>
      </div>
      <div className={`memory-scene-canvas ${zoom ? "is-zoomed" : ""}`}>
        <svg
          viewBox={viewBox}
          className="memory-scene-art"
          role="group"
          aria-label={`${scene?.name || palace.title}，${palace.stations.length}个固定位置。${interactive ? "点击位置，或用方向键沿路线选择。" : ""}`}
        >
          <defs>
            <pattern
              id={`${prefix}-tiles`}
              width="48"
              height="48"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M48 0H0V48"
                fill="none"
                stroke="#758664"
                strokeWidth=".6"
                opacity=".09"
              />
            </pattern>
            <marker
              id={`${prefix}-arrow`}
              markerWidth="7"
              markerHeight="7"
              refX="5"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0 0 6 3 0 6Z" fill="#ae724f" />
            </marker>
            <filter
              id={`${prefix}-selected`}
              x="-40%"
              y="-40%"
              width="180%"
              height="180%"
            >
              <feDropShadow
                dx="0"
                dy="4"
                stdDeviation="6"
                floodColor="#385642"
                floodOpacity=".16"
              />
            </filter>
          </defs>
          <rect width="960" height="550" fill="#f6f0dc" />
          <rect width="960" height="550" fill={`url(#${prefix}-tiles)`} />
          <path
            d="M29 47V27H49M911 27H931V47M931 503V523H911M49 523H29V503"
            fill="none"
            stroke="#b5bb9e"
            strokeWidth="1.5"
          />
          <Architecture type={scene?.type || "gallery"} />
          <g className="ms-route" aria-hidden="true">
            <path
              d={routePath(points)}
              fill="none"
              stroke="#fff9e6"
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity=".9"
            />
            <path
              d={routePath(points)}
              fill="none"
              stroke="#ad7856"
              strokeWidth="2.5"
              strokeDasharray="5 8"
              strokeLinecap="round"
              strokeLinejoin="round"
              markerEnd={`url(#${prefix}-arrow)`}
            />
            <g
              transform={`translate(${points[0][0] - 44} ${points[0][1] + 49})`}
            >
              <path d="M-11-9 4 0-11 9Z" fill="#ae724f" />
              <text x="-18" y="4" textAnchor="end" className="ms-entry">
                起点
              </text>
            </g>
          </g>
          <g className="ms-stations">
            {palace.stations.map((station, index) => {
              const [x, y] = points[index];
              const selected = index === activeIndex;
              return (
                <g
                  key={station.id}
                  transform={`translate(${x} ${y})`}
                  className={`ms-station ${selected ? "is-active" : ""}`}
                  role={interactive ? "button" : undefined}
                  tabIndex={interactive ? (selected ? 0 : -1) : undefined}
                  aria-label={
                    concealLabels
                      ? `第${index + 1}站`
                      : `第${index + 1}站：${station.place}`
                  }
                  aria-pressed={interactive ? selected : undefined}
                  data-station-index={index}
                  onClick={interactive ? () => onSelect(index) : undefined}
                  onKeyDown={
                    interactive
                      ? (event) => selectByKeyboard(event, index)
                      : undefined
                  }
                >
                  <title>
                    {concealLabels ? `第${index + 1}站` : station.place}
                  </title>
                  <rect
                    className="ms-station-hit"
                    x="-70"
                    y="-66"
                    width="140"
                    height="137"
                    rx="12"
                    fill="transparent"
                  />
                  <ellipse
                    className="ms-station-ground"
                    cy="39"
                    rx="55"
                    ry="13"
                    fill="#648d7130"
                  />
                  <rect
                    className="ms-selection"
                    x="-61"
                    y="-62"
                    width="122"
                    height="121"
                    rx="12"
                    fill="#fff8df"
                    stroke="#3f7355"
                    strokeWidth="2.5"
                    filter={`url(#${prefix}-selected)`}
                  />
                  <g aria-hidden="true">
                    <Prop
                      kind={scene?.props[index] || "ledger"}
                      hidden={concealLabels}
                    />
                  </g>
                  <circle
                    className="ms-station-number"
                    cx="-43"
                    cy="-42"
                    r="14"
                    fill={selected ? "#a96348" : "#3d654f"}
                    stroke="#fff7df"
                    strokeWidth="3"
                  />
                  <text
                    className="ms-station-index"
                    x="-43"
                    y="-37"
                    textAnchor="middle"
                    fill="#fff7df"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </text>
                  {!concealLabels && (
                    <text
                      x="0"
                      y="61"
                      textAnchor="middle"
                      className="ms-place"
                      aria-hidden="true"
                    >
                      {station.place.length > 11
                        ? `${station.place.slice(0, 10)}…`
                        : station.place}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
        <div className="memory-scene-caption" aria-live="polite">
          <span className="memory-scene-current">
            {String(activeIndex + 1).padStart(2, "0")}
          </span>
          <span>
            {concealLabels
              ? `回想第 ${activeIndex + 1} 站的物件和规则`
              : palace.stations[activeIndex]?.place}
          </span>
          <span className="memory-scene-total">
            / {palace.stations.length} 站
          </span>
        </div>
      </div>
      <figcaption>
        <p>
          {scene?.detail || "沿固定路线逐站回忆。"}
          {interactive && <span>点位置看细节，点「近看」放大当前站。</span>}
        </p>
        {showNavigation && interactive && (
          <nav className="memory-scene-stops" aria-label="选择记忆位置">
            {palace.stations.map((station, index) => (
              <button
                type="button"
                key={station.id}
                className={index === activeIndex ? "active" : ""}
                onClick={() => onSelect(index)}
                aria-pressed={index === activeIndex}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                {concealLabels ? `第${index + 1}站` : station.place}
              </button>
            ))}
          </nav>
        )}
      </figcaption>
    </figure>
  );
}
