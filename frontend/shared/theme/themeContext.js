import React, { createContext, useContext, useState }  from 'react';
import { lightTheme, darkTheme } from './theme';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [isDark, setIsDark] = useState(false); //light -> default

    const toggleTheme = () => {
        setIsDark((prev) => !prev); //callback 
    }

    const theme = isDark ? darkTheme : lightTheme;


    return (
        <ThemeContext.Provider value = {{ theme, isDark, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );

};

//custom hook to consume theme in any component 
export const useTheme = () =>{
    const context = useContext(ThemeContext);
    if(!context){
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}