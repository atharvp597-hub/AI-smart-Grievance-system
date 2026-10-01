import { TypeAnimation } from 'react-type-animation';

const CodeBlocks = ({ codeText, codeColor, noOfLines, codeBlockId }) => {

  let leftColumns = [];
  for (let i = 1; i <= noOfLines; i++) {
    leftColumns.push(<p key={i}>{i}</p>);
  }

  return (
    <div className="flex flex-col my-5 md:my-10 justify-between gap-10">
      {/* Code Block with Outer Shadow */}
      <div className="relative lg:w-[500px]">
        
        {/* 🔥 Pure CSS Shadow - Jo pakka dikhega */}
        <div className="absolute -inset-4 rounded-xl opacity-70"
          style={{
            boxShadow: codeBlockId === 'bg-yellow-500' 
              ? '0 0 30px 10px rgba(234, 179, 8, 0.5)'  // Yellow shadow
              : '0 0 30px 10px rgba(6, 182, 212, 0.5)', // Cyan shadow
            filter: 'blur(4px)'
          }}
        ></div>
        
        {/* Actual Code Block */}
        <div className='flex flex-row py-3 border border-gray-600 rounded-xl bg-gray-900 h-fit text-[10px] sm:text-sm leading-[18px] sm:leading-6 relative overflow-hidden z-10'>
          
          {/* Line Numbers */}
          <div className='w-[12%] flex flex-col text-center select-none text-gray-500 font-mono font-bold border-r border-gray-800'>
            {leftColumns}
          </div>
          
          {/* Code Content */}
          <div className={`w-[88%] ${codeColor} pr-3 pl-2 font-mono`}>
            <TypeAnimation
              sequence={[codeText, 2000, '']}
              omitDeletionAnimation={true}
              repeat={Infinity}
              style={{
                whiteSpace: 'pre-wrap',
                display: 'block',
                fontFamily: 'monospace',
                fontSize: '12px',
                lineHeight: '24px',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default CodeBlocks