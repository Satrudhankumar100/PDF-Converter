import React, { useRef, useState } from 'react'
import { closestCorners, DndContext, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import ImgList from '../components/ImgList';
import { arrayMove, horizontalListSortingStrategy, rectSortingStrategy, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { PageNoPosition } from '../utils/PageNoPosition';
import axios, { Axios } from 'axios';
import { baseUrl } from '../utils/BaseUrl';
import PdfList from '../components/PDFList';
import UploadingProgress from '../components/UploadingProgress';

const MergePDF = () => {
    const [isUploading, setUploading] = useState(false);
    const [progressValue, setProgressValue] = useState(0);
    const [status, setStatus] = useState(1);
    const [downloadFile, setDownloadFile] = useState(null);
    const fileInput = useRef(null)
    const [files, setFiles] = useState([]);
    const [isAddPageNo, setIsAddPageNo] = useState(false);
    const [pageNoData, setPageNoData] = useState({ startingPageNo: 1, pageNoPosition: PageNoPosition.TOP_LEFT })
    const [dragActive, setDragActive] = useState(false);
    const [dropableStyle, setDropableStyle] = useState('-z-10')


    const pagePosition = Object.keys(PageNoPosition);

    console.log(pageNoData)

    const handleDownload = () => {
        if (!downloadFile) return;
        const fileURL = window.URL.createObjectURL(new Blob([downloadFile]));
        const link = document.createElement('a');
        link.href = fileURL;
        link.setAttribute('download', 'generated.pdf');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };
    
      const handleCancelBtn = () => {
        setDownloadFile(null);
        setFiles([]);
        setStatus(0);
        setProgressValue(0);
        setUploading(false);
        
      };

    const onChange = async e => {
        const newFiles = Array.from(e.target.files).map((file, index) => ({
            id: index + files.length,
            file,
        }));
        setFiles(prevFiles => [...prevFiles, ...newFiles]);
    }


    const handleDragEnd = event => {
        const { active, over } = event;
        console.log(active)
        console.log(over)
        if (active.id === over.id) {
            return;
        }

        setFiles(() => {

            const originalPosition = getPosition(active.id);
            const LatestPosition = getPosition(over.id);
            return arrayMove(files, originalPosition, LatestPosition);

        })

    }

    const removeImageBtn = (id) => {
        setFiles(prev => prev.filter(file => file.id !== id));
    }

    const getPosition = (id) => {
        return files.findIndex((obj) => obj.id === id)
    }

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(TouchSensor)
    )


    // handle Drag and drop from drives
    const handleDragEnterOutSideDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (dropableStyle == '-z-10') {
            setDropableStyle('z-10')
        }

    }
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (event.type === "dragleave") {
            setDragActive(false);
        }
    }

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const newFiles = Array.from(e.dataTransfer.files).map((file, index) => ({
                id: index + files.length,
                file,
            }));
            setFiles(prevFiles => [...prevFiles, ...newFiles]);
        }
        if (dropableStyle == 'z-10') {
            setDropableStyle('-z-10')
        }
    }

    const handleUploadBtn = async () => {
        const formData = new FormData()
        files.forEach(file => formData.append("files", file.file))

        setUploading(true);
        setStatus(0);

        try {
            const resp = await axios.post(`${baseUrl}/pdf/merge`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data', // Set the appropriate content type
                },
                responseType: 'blob',
                onUploadProgress: (progressEvent) => {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setProgressValue(progress);
                }
            })

           
            setStatus(1);
            setDownloadFile(resp.data);

            const fileURL = window.URL.createObjectURL(new Blob([resp.data]));
            const link = document.createElement('a');
            link.href = fileURL;
            link.setAttribute('download', 'generated.pdf'); // Name the file
            document.body.appendChild(link);
            link.click(); // Programmatically click the link to trigger download
            document.body.removeChild(link); // Clean up

        } catch (error) {
            console.log("error===================", error);
            setUploading(false);
        }


    }


    return (
        <>
            {/* container */}
            <div className='flex flex-col mt-20 min-h-screen gap-4 p-5' onDragEnter={handleDragEnterOutSideDrop}>

                {isUploading && (
                    <UploadingProgress
                        progressValue={progressValue}
                        status={status}
                        cancelBtn={handleCancelBtn}
                        downloadBtn={handleDownload}
                    />
                )}


                <div className='text-3xl font-bold flex justify-center '>Merge PDF</div>
                <div className='text-xl flex  justify-center ' >Combine PDFs in the order you want with the easiest PDF merger available.</div>
                <div className='flex justify-center gap-5 '>
                    <div onClick={() => fileInput.current.click()} className=' text-white text-2xl  cursor-pointer px-4 py-2 bg-red-400 rounded-lg'>Add PDF</div>
                    <input
                        type='file'
                        name='image'
                        ref={fileInput}
                        onChange={onChange}
                        style={{ display: 'none' }}
                        multiple={true}
                        accept="application/pdf"
                    />
                    {/* Send images to backend  */}
                    {
                        files.length > 0 && <div className=' text-white text-2xl font-bold  cursor-pointer px-4 py-2 bg-green-400 rounded-lg ' onClick={handleUploadBtn} > Upload</div>
                    }


                </div>

             

                {/* preview the images and order them */}
                {files.length > 0 && <div className='flex justify-center items-center mt-10'>

                    <DndContext sensors={sensors} onDragEnd={handleDragEnd} collisionDetection={closestCorners} >
                        <SortableContext items={files} strategy={rectSortingStrategy}>
                            <div className='bg-gray-300 max-h-96 overflow-y-auto px-5 py-2 grid justify-center items-center  grid-cols-5 gap-3'>
                                {
                                    files.map((file, index) => {

                                        return <div>
                                         <div key={file.id} className="relative overflow-hidden h-32">
                                            <div className=' h-5 flex absolute z-40 w-full  justify-between px-2  rounded-full '>
                                                <div className='w-5 h-5 flex justify-center items-center bg-blue-200 rounded-full'>{index + 1}</div>
                                                <div className='text-red-500 font-bold cursor-pointer' onClick={() => removeImageBtn(file.id)}>X</div>
                                            </div>
                                            <PdfList file={file.file} id={file.id} val={index} />
                                        </div>
                                            <div className='text-center'>{file.file.name.length<8?file.file.name: file.file.name.substring(0,8)+"..."}</div>
                                        </div>
                                    })
                                }
                            </div>
                        </SortableContext>
                    </DndContext>

                </div>
                }

                {/* drag and drop event */}
                <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`w-full h-screen left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                         bg-[#9d8be3f5] absolute ${dropableStyle} flex justify-center items-center
                         font-bold text-2xl
                         p-20
                         `}
                >
                    <div className='border-2 border-gray-600  border-dashed w-full h-full flex justify-center items-center'>

                        Drag and Drop Here
                    </div>
                </div>


            </div>
        </>
    )
}

export default MergePDF