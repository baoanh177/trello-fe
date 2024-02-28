import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { 
    DndContext, 
    useSensor, 
    useSensors, 
    MouseSensor, 
    TouchSensor, 
    DragOverlay, 
    defaultDropAnimationSideEffects, 
    pointerWithin,
    closestCorners
} from "@dnd-kit/core"
import { arrayMove } from '@dnd-kit/sortable';
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable"
import { cloneDeep } from "lodash";

import Column from "./Column/Column"
import Task from "./Column/ListTask/Task"
import AddColForm from "./Column/AddColForm"
import "./Home.css"

import { getData } from "../../redux/middlewares/dataMiddleware"
import { dataSlice } from "../../redux/slices/dataSlice"
const { orderColumn, changeColumn, orderTask } = dataSlice.actions

const ACTIVE_DRAG_TYPE = {
    BOX: "ACTIVE_DRAG_TYPE_BOX",
    TASK: "ACTIVE_DRAG_TYPE_TASK",
}

function Home() {
    const [activeDrag, setActiveDrag] = useState({})
    const cols = useSelector(state => state.data.cols)
    const tasks = useSelector(state => state.data.tasks)
    const dispatch = useDispatch()

    useEffect(() => {
        dispatch(getData())
    }, [])

    // hold 250ms - Dung sai cảm ứng 5px
    const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 500 } })
    const mouseSensor = useSensor(MouseSensor, { activationConstraint: { distance: 10 } })
    const sensors = useSensors(mouseSensor, touchSensor)

    const handleDragStart = event => {
        console.log('handleDragStart ', event)
        setActiveDrag({
            activeId: event?.active?.id,
            activeType: event?.active?.data?.current?.columnName ? 
                        ACTIVE_DRAG_TYPE.BOX : 
                        ACTIVE_DRAG_TYPE.TASK,
            activeData: event?.active?.data?.current
        })
    }

    const handleDragOver = event => {
        // console.log('handleDragOver ', event)
        const { active, over } = event

        if(!active || !over) return

        if(activeDrag.activeType === ACTIVE_DRAG_TYPE.BOX) return

        if(activeDrag.activeType === ACTIVE_DRAG_TYPE.TASK) {
            const { id: activeDraggingCardId, data: { current: activeDraggingCardData } } = active
            const { id: overCardId } = over

            const activeItem = active.data.current
            const overColumn = over.data.current
            
            if(!activeItem || !overColumn) return
            
            if(activeItem.column != overColumn.column && overColumn.columnName) {
                dispatch(changeColumn({
                    taskKey: activeDraggingCardId,
                    column: overColumn.column
                }))
            }
        }
    }

    const handleDragEnd = event => {
        // console.log('handleDragEnd', event)
        const { active, over } = event

        if(!over || !active) {
            return
        }

        console.log({active, over})

        if(activeDrag.activeType === ACTIVE_DRAG_TYPE.TASK) {
            // console.log(active)
            if((active.id !== over.id && !over.data.current.columnName) || activeDrag.activeData.column != over.data.current.column) {
                const overColumnTasks = []
                const remainTasks = []
                
                cloneDeep(tasks).forEach(task => {
                    if(task.column == over.data.current.column) {
                        overColumnTasks.push(task)
                    }else {
                        remainTasks.push(task)
                    }
                })

                const oldCardIndex = overColumnTasks.findIndex(task => task.key == active.id)
                const newCardIndex = overColumnTasks.findIndex(task => task.key == over.id)

                const orderedTasks = [...arrayMove(overColumnTasks, oldCardIndex, newCardIndex), ...remainTasks]
                dispatch(orderTask(orderedTasks))
            }
        }

        if(activeDrag.activeType === ACTIVE_DRAG_TYPE.BOX) {
            if(active.id !== over.id) {
                const oldIndex = cols.findIndex(col => col.column == active.id)
                const newIndex = cols.findIndex(col => col.column == over.id)

                const orderedCols = arrayMove(cols, oldIndex, newIndex)
                dispatch(orderColumn(orderedCols))
            }
        }
        setActiveDrag({})
    }

    const dropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: {
                    opacity: '0.5'
                }
            }
        })
    }


    return (
        <DndContext 
            onDragStart={handleDragStart} 
            onDragOver={handleDragOver} 
            onDragEnd={handleDragEnd} 
            sensors={sensors}
            collisionDetection={pointerWithin}
        >
            <div className="container">
                
                <SortableContext items={cols?.map(c => c.column)} strategy={horizontalListSortingStrategy}>
                    {cols.map((col, index) => <Column key={col.column} col={col}/>)}
                </SortableContext>

                <DragOverlay dropAnimation={dropAnimation} >
                    {!activeDrag.activeType && null}
                    {activeDrag.activeType === ACTIVE_DRAG_TYPE.BOX ? 
                        <Column col={activeDrag.activeData} /> : 
                        <Task task={activeDrag.activeData} />}
                </DragOverlay>
                <AddColForm />
            </div>
        </DndContext>
    )
}

export default Home
